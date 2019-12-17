CREATE SCHEMA cmgg;
USE cmgg;

SET GLOBAL event_scheduler = 1;


CREATE TABLE mastery_scores (
	platform       VARCHAR(6)      NOT NULL,
	player_id      BIGINT UNSIGNED NOT NULL,
	/** The ID of the champion (or -1 to indicate total points, or -2 to indicate total level). */
	champion_id    SMALLINT        NOT NULL,
	mastery_points INT UNSIGNED    NOT NULL,

	/** Used for selecting mastery scores for a specific player. */
	PRIMARY KEY (player_id, champion_id),

	/** Used for selecting global top players for each champion. */
	INDEX IX_mastery_points (champion_id, mastery_points DESC),
	INDEX IX_regional_mastery_points (platform, champion_id, mastery_points DESC)
) ENGINE = InnoDB;

CREATE TABLE summoners (
	/** A unique ID used for foreign keys. */
	player_id              BIGINT UNSIGNED AUTO_INCREMENT                                NOT NULL,
	platform               VARCHAR(6)                                                    NOT NULL,
	/** Lengths are from https://discordapp.com/channels/187652476080488449/379429593829867521/529295034973945906 */
	encrypted_puuid        CHAR(78)                                                      NULL,
	encrypted_summoner_id  VARCHAR(63)                                                   NOT NULL,
	encrypted_account_id   VARCHAR(56)                                                   NOT NULL,
	/** The last known name of the summoner. */
	summoner_name          VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
	masteries_last_updated TIMESTAMP        DEFAULT '2010-01-01 00:00:01'                NOT NULL,
	name_last_updated      TIMESTAMP        DEFAULT '2010-01-01 00:00:01'                NOT NULL,
	summoner_status        TINYINT UNSIGNED DEFAULT 0                                    NOT NULL,

	CONSTRAINT UX_player_id UNIQUE (player_id),
	CONSTRAINT UX_account_id UNIQUE (platform, encrypted_account_id),
	/** The platform is used as the secondary index because the same PUUID may exist across multiple regions (if the
	player transferred regions), and finding transferred accounts requires finding accounts across all regions that share
	a PUUID */
	CONSTRAINT UX_puuid UNIQUE (encrypted_puuid, platform),

	PRIMARY KEY (platform, encrypted_summoner_id),

	/** Used for selecting summoners to automatically update their mastery scores. */
	INDEX IX_masteries_last_updated (platform, masteries_last_updated),
	/** Used for selecting summoners to automatically update their names. */
	INDEX IX_name_last_updated (platform, name_last_updated)
) ENGINE = InnoDB;

CREATE TABLE platforms (
	/** The index of this platform in the user-facing region selector. */
	ordinal     TINYINT UNSIGNED NOT NULL,
	platform_id VARCHAR(6)       NOT NULL,
	region_id   VARCHAR(6)       NOT NULL,
	CONSTRAINT UX_ordinal UNIQUE (ordinal),
	CONSTRAINT UX_region_id UNIQUE (region_id),

	PRIMARY KEY (platform_id)
) ENGINE = InnoDB;


ALTER TABLE mastery_scores
	ADD CONSTRAINT FK__mastery_scores__id FOREIGN KEY (player_id) REFERENCES summoners (player_id),
	ADD CONSTRAINT FK__mastery_scores__platform FOREIGN KEY (platform) REFERENCES platforms (platform_id);

ALTER TABLE summoners
	ADD CONSTRAINT FK__summoners__platform FOREIGN KEY (platform) REFERENCES platforms (platform_id);


INSERT INTO platforms (region_id, platform_id, ordinal)
VALUES ('BR', 'BR1', 3),
	('EUNE', 'EUN1', 2),
	('EUW', 'EUW1', 1),
	('JP', 'JP1', 10),
	('KR', 'KR', 5),
	('LAN', 'LA1', 8),
	('LAS', 'LA2', 7),
	('NA', 'NA1', 0),
	('OCE', 'OC1', 4),
	('RU', 'RU', 9),
	('TR', 'TR1', 6);


DELIMITER $$

/** Takes a platform ID and returns a region ID. */
CREATE FUNCTION get_region_by_platform(platform_id VARCHAR(6)) RETURNS VARCHAR(6) DETERMINISTIC
BEGIN
	DECLARE region VARCHAR(6);
	SELECT region_id INTO region FROM platforms WHERE platforms.platform_id = platform_id;
	RETURN region;
END $$

/** Returns the name of the summoner if they haven't been hidden, or `NULL` if they have been. */
CREATE FUNCTION get_summoner_name(summoner_name   VARCHAR(100),
								  summoner_status TINYINT UNSIGNED) RETURNS VARCHAR(100) DETERMINISTIC
BEGIN
	RETURN IF(summoner_status = 2 OR summoner_status = 3, NULL, summoner_name);
END $$

CREATE PROCEDURE select_summoner_to_update_name(platform VARCHAR(6))
BEGIN
	SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
	-- TODO adjust cutoff date
	SELECT *
	FROM summoners
	WHERE summoners.platform = platform AND name_last_updated < DATE_SUB(NOW(), INTERVAL 7 DAY)
	ORDER BY name_last_updated ASC
	LIMIT 1
	FOR
	UPDATE SKIP LOCKED;
END $$

CREATE PROCEDURE select_summoner_to_update_masteries(platform VARCHAR(6))
BEGIN
	SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
	-- TODO adjust cutoff date
	SELECT *
	FROM summoners
	WHERE summoners.platform = platform AND masteries_last_updated < DATE_SUB(NOW(), INTERVAL 4 DAY)
	ORDER BY masteries_last_updated ASC
	LIMIT 1
	FOR
	UPDATE SKIP LOCKED;
END $$

# TODO find most recent summoner using total mastery points instead of last_match_timestamp and update this.
# CREATE PROCEDURE mark_transferred_summoners()
# BEGIN
# 	UPDATE summoners
# 		JOIN (SELECT player_id,
# 				  RANK() OVER (PARTITION BY encrypted_puuid
# 					  ORDER BY last_match_timestamp DESC) AS recency_rank
# 			  FROM summoners
# 			  WHERE encrypted_puuid IS NOT NULL) AS ranked ON (ranked.player_id = summoners.player_id)
# 	SET summoners.summoner_status =
# 		CASE WHEN recency_rank = 1
# 				 THEN CASE WHEN summoners.summoner_status = 1
# 							   THEN 0
# 						   ELSE summoners.summoner_status END
# 			 ELSE 1 END;
# END $$

CREATE PROCEDURE get_highscores_summary()
BEGIN
	DECLARE done TINYINT DEFAULT FALSE;
	DECLARE champ_id SMALLINT;
	DECLARE cur CURSOR FOR SELECT DISTINCT mastery_scores.champion_id FROM mastery_scores;
	DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

	DROP TEMPORARY TABLE IF EXISTS highscores_summary;
	CREATE TEMPORARY TABLE highscores_summary (
		region     VARCHAR(6)   NOT NULL,
		name       VARCHAR(100) NULL,
		championId SMALLINT     NOT NULL,
		points     INT UNSIGNED NOT NULL
	) ENGINE = InnoDB;

	OPEN cur;
	cur_loop:
	LOOP
		FETCH cur INTO champ_id;
		IF done
		THEN
			LEAVE cur_loop;
		END IF;

		INSERT INTO highscores_summary
		SELECT get_region_by_platform(ordered.platform),
			get_summoner_name(summoner_name, summoner_status),
			champion_id,
			mastery_points
		FROM (
			SELECT player_id,
				platform,
				champion_id,
				mastery_points
			FROM mastery_scores
			WHERE mastery_scores.champion_id = champ_id
				-- Limit to top 10 so the entire table doesn't need to be joined.
			ORDER BY mastery_points DESC
			LIMIT 10
		) ordered
				 INNER JOIN summoners ON ordered.player_id = summoners.player_id
		WHERE summoner_status != 1
		LIMIT 3;
	END LOOP;
	CLOSE cur;

	SELECT * FROM highscores_summary;
	DROP TEMPORARY TABLE highscores_summary;
END $$

CREATE PROCEDURE get_champion_highscores(champion_id SMALLINT)
BEGIN
	SELECT summoner_status AS summonerStatus,
		get_region_by_platform(ordered.platform) AS region,
		get_summoner_name(summoner_name, summoner_status) AS name,
		mastery_points AS points
	FROM (
		SELECT player_id,
			platform,
			champion_id,
			mastery_points
		FROM mastery_scores
		WHERE mastery_scores.champion_id = champion_id
			-- Limit to top 75 so the entire table doesn't need to be joined.
		ORDER BY mastery_points DESC
		LIMIT 75
	) ordered
			 INNER JOIN summoners ON ordered.player_id = summoners.player_id
	WHERE summoner_status != 1
	LIMIT 50;
END $$

CREATE PROCEDURE mark_summoner_for_update(summoner_id VARCHAR(63),
										  account_id  VARCHAR(56),
										  name        VARCHAR(100),
										  platformId  VARCHAR(6))
BEGIN
	INSERT INTO summoners
	(encrypted_summoner_id, encrypted_account_id, summoner_name, platform, name_last_updated, masteries_last_updated)
	VALUES (summoner_id, account_id, name, platformId, NOW(), '1970-01-01 00:00:01')
	ON DUPLICATE KEY UPDATE summoner_name = name,
		name_last_updated                 = NOW(),
		masteries_last_updated            = '1970-01-01 00:00:01';
END $$

DELIMITER ;


# TODO reenable this once `mark_transferred_summoners()` has been updated.
# /* Mark transferred summoners at regular intervals. */
# CREATE EVENT find_transferred_accounts
# 	ON SCHEDULE AT CURRENT_TIMESTAMP + INTERVAL 6 HOUR
# 	DO
# 	CALL mark_transferred_summoners();
