USE cmgg;
DROP PROCEDURE IF EXISTS get_top_players;
CREATE PROCEDURE get_top_players()
BEGIN
    DECLARE done TINYINT DEFAULT FALSE;
    DECLARE champ_id SMALLINT;
    DECLARE cur CURSOR FOR SELECT DISTINCT mastery_scores.champion_id FROM mastery_scores;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    DROP TEMPORARY TABLE IF EXISTS highscores_summary;
    CREATE TEMPORARY TABLE highscores_summary (
        champion_id     SMALLINT     NOT NULL,
        summoner_name   VARCHAR(100) NULL,
        platform        VARCHAR(6)   NOT NULL,
        encrypted_puuid CHAR(78),
        riot_id         VARCHAR(100)
    ) ENGINE = InnoDB;

    OPEN cur;
    cur_loop:
    LOOP
        FETCH cur INTO champ_id;
        IF done THEN
            LEAVE cur_loop;
        END IF;

        INSERT INTO highscores_summary
        SELECT
            champion_id,
            summoner_name,
            summoners.platform,
            encrypted_puuid,
            riot_id
        FROM mastery_scores
                 INNER JOIN summoners ON mastery_scores.player_id = summoners.player_id
        WHERE mastery_scores.champion_id = champ_id
        ORDER BY mastery_points DESC
        LIMIT 50;
    END LOOP;
    CLOSE cur;

    SELECT summoner_name, platform, encrypted_puuid, riot_id FROM highscores_summary;

    DROP TEMPORARY TABLE highscores_summary;
END;
