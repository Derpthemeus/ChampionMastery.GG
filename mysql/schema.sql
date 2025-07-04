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
	encrypted_puuid        CHAR(78)                                                      NOT NULL,
	-- TODO make this non-nullable once migration is complete.
	riot_id                VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci     NULL,
	masteries_last_updated TIMESTAMP        DEFAULT '2010-01-01 00:00:01'                NOT NULL,
	name_last_updated      TIMESTAMP        DEFAULT '2010-01-01 00:00:01'                NOT NULL,
    /** The value of the `revisionDate` field from the Summoner-v4 API. */
	revision_date          TIMESTAMP                                                     NOT NULL,
	summoner_status        TINYINT UNSIGNED DEFAULT 0                                    NOT NULL,

	CONSTRAINT UX_player_id UNIQUE (player_id),
    -- TODO is this still needed after changing primary key from summoner ID to PUUID?
	/** The platform is used as the secondary index because the same PUUID may exist across multiple regions (if the
	player transferred regions), and finding transferred accounts requires finding accounts across all regions that share
	a PUUID */
	CONSTRAINT UX_puuid UNIQUE (encrypted_puuid, platform),

	PRIMARY KEY (platform, encrypted_puuid),

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

CREATE TABLE rank_thresholds (
    /** The ID of the champion (or -1 to indicate total points, or -2 to indicate total level). */
    champion_id    SMALLINT        NOT NULL,
    mastery_points INT UNSIGNED    NOT NULL,
    `rank`         INT UNSIGNED    NOT NULL,

    PRIMARY KEY (champion_id, `rank`)
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
	('TR', 'TR1', 6),
	('VN', 'VN2', 11),
	('PH', 'PH2', 12),
	('SG', 'SG2', 13),
	('TW', 'TW2', 14),
	('TH', 'TH2', 15),
	('MENA', 'ME1', 16);

DELIMITER $$

CREATE PROCEDURE mark_transferred_summoners()
BEGIN
	UPDATE summoners
		JOIN (SELECT player_id,
				  RANK() OVER (PARTITION BY encrypted_puuid
					  ORDER BY revision_date DESC) AS recency_rank
			  FROM summoners
			  WHERE encrypted_puuid IS NOT NULL) AS ranked ON (ranked.player_id = summoners.player_id)
	SET summoners.summoner_status =
		CASE WHEN recency_rank = 1
				 THEN CASE WHEN summoners.summoner_status = 1
							   THEN 0
						   ELSE summoners.summoner_status END
			 ELSE 1 END;
END $$

CREATE PROCEDURE update_rank_thresholds_table()
BEGIN
    START TRANSACTION;
    DELETE FROM rank_thresholds WHERE TRUE;
    INSERT INTO rank_thresholds (champion_id, `rank`, mastery_points)  SELECT champion_id, `rank`, mastery_points
    FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY champion_id ORDER BY mastery_points DESC) AS `rank` FROM mastery_scores) ranked
    WHERE `rank` IN (100, 500, 1000, 5000, 10000, 50000, 100000, 500000, 1000000);
    COMMIT;
END $$

DELIMITER ;


/* Mark transferred summoners at regular intervals. */
CREATE EVENT find_transferred_accounts
	ON SCHEDULE AT CURRENT_TIMESTAMP + INTERVAL 6 HOUR
	DO
	CALL mark_transferred_summoners();

/* Update rank thresholds at regular intervals. */
CREATE EVENT update_rank_thresholds_table
    ON SCHEDULE AT CURRENT_TIMESTAMP + INTERVAL 1 HOUR
    DO
    CALL update_rank_thresholds_table();
