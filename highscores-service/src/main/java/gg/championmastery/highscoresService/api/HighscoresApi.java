package gg.championmastery.highscoresService.api;

import com.google.common.collect.ImmutableMap;
import com.merakianalytics.orianna.types.common.OriannaException;
import com.merakianalytics.orianna.types.common.Platform;
import com.merakianalytics.orianna.types.dto.championmastery.ChampionMasteries;
import com.merakianalytics.orianna.types.dto.championmastery.ChampionMastery;
import com.merakianalytics.orianna.types.dto.summoner.Summoner;
import gg.championmastery.highscoresService.HighscoresService;
import gg.championmastery.highscoresService.persistence.MasteryScoreEntity;
import gg.championmastery.highscoresService.persistence.SummonerEntity;
import org.hibernate.LockMode;
import org.hibernate.Session;
import org.hibernate.Transaction;
import org.hibernate.query.Query;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.persistence.LockModeType;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.function.Function;
import java.util.stream.Collectors;

public class HighscoresApi {

	private static final Logger logger = LoggerFactory.getLogger(HighscoresApi.class);

	/**
	 * Retrieves the champion mastery scores for the specified summoner, updates their summoner information in the
	 * database, and adds their scores to the highscores table if they're high enough to qualify. All database
	 * modifications occur asynchronously.
	 *
	 * @param summoner The summoner whose scores should be retrieved.
	 * @return The summoner's mastery scores for every champion.
	 * @throws OriannaException thrown if the Riot Games API returns an error.
	 */
	public ChampionMasteries getSummonerScores(Summoner summoner) throws OriannaException {
		ChampionMasteries masteries = HighscoresService.getOriannaPipeline().get(ChampionMasteries.class, ImmutableMap.of(
				"platform", Platform.withTag(summoner.getPlatform()),
				"summonerId", summoner.getId()
		));

		// Asynchronously check if the summoner is in the database, and add them if they're not.
		CompletableFuture.runAsync(() -> {
			Transaction tx = null;
			SummonerEntity.Key summonerKey = new SummonerEntity.Key(summoner.getPlatform(), summoner.getId());
			try (Session session = HighscoresService.getHibernateSessionFactory().openSession()) {
				tx = session.beginTransaction();
				SummonerEntity summonerEntity = session.get(SummonerEntity.class, summonerKey, LockMode.PESSIMISTIC_WRITE);
				// If the summoner doesn't already exist in the database, create a new entity
				if (summonerEntity == null) {
					summonerEntity = SummonerEntity.getInstantiator().acquireEntity(summonerKey);
					// If the summoner has already been instantiated by another thread, abort.
					if (summonerEntity == null) {
						return;
					}

					summonerEntity.setEncryptedAccountId(summoner.getAccountId());
				}

				// Update the summoner entity.
				summonerEntity.setSummonerName(summoner.getName());
				summonerEntity.setNameLastUpdatedInstant(Instant.now());
				summonerEntity.setRevisionDateInstant(Instant.ofEpochMilli(summoner.getRevisionDate()));
				summonerEntity.setMasteriesLastUpdatedInstant(Instant.now());
				session.saveOrUpdate(summonerEntity);

				// Update the summoner's mastery scores.
				List<MasteryScoreEntity> results = session
						.createQuery("FROM MasteryScoreEntity WHERE platform=:platform AND summoner=:id")
						.setParameter("platform", summonerEntity.getPlatform())
						.setParameter("id", summonerEntity)
						.setLockMode(LockModeType.PESSIMISTIC_WRITE)
						.getResultList();
				Map<Short, MasteryScoreEntity> scores = results.stream().collect(Collectors.toMap(MasteryScoreEntity::getChampionId, Function.identity()));

				// Consider saving each score and calculate total level/points.
				int totalPoints = 0;
				int totalLevel = 0;
				for (ChampionMastery score : masteries) {
					MasteryScoreEntity scoreEntity = getMasteryScoreEntity(scores, summonerEntity, (short) score.getChampionId(), score.getChampionPoints());
					considerSaveOrUpdate(scoreEntity, session);
					totalPoints += score.getChampionPoints();
					totalLevel += score.getChampionLevel();
				}
				considerSaveOrUpdate(getMasteryScoreEntity(scores, summonerEntity, (short) -1, totalPoints), session);
				considerSaveOrUpdate(getMasteryScoreEntity(scores, summonerEntity, (short) -2, totalLevel), session);

				tx.commit();
			} catch (Exception ex) {
				if (tx != null && tx.isActive()) {
					tx.setRollbackOnly();
				}

				logger.error(String.format("Error updating mastery scores for summoner '%s' (%s)", summoner.getName(), summoner.getPlatform()), ex);
			} finally {
				// Release the entity if it was locked by the instantiator.
				SummonerEntity.getInstantiator().persistEntity(summonerKey);
			}
		});

		return masteries;
	}

	/**
	 * Retrieves a list of the top 3 players for each champion (including total level/points).
	 *
	 * @return Lists of the top 3 players for each champion in descending order, mapped by champion ID.
	 */
	public Map<Short, List<MasteryScoreEntity>> getHighscoresSummary() {
		try (Session session = HighscoresService.getHibernateSessionFactory().openSession()) {
			List<Short> championIds = session.createQuery("SELECT DISTINCT(championId) FROM MasteryScoreEntity", Short.class).getResultList();

			HashMap<Short, List<MasteryScoreEntity>> highscoresSummary = new HashMap<>();
			for (short championId : championIds) {
				Query<MasteryScoreEntity> query = session.createQuery("FROM MasteryScoreEntity WHERE championId=:championId AND summoner.status != 1 ORDER BY masteryPoints DESC", MasteryScoreEntity.class)
						.setParameter("championId", championId)
						.setMaxResults(3);
				highscoresSummary.put(championId, query.getResultList());
			}

			return highscoresSummary;
		}
	}

	/**
	 * Retrieves a list of the top 50 players for the specified champion. This method does not attempt to verify that a
	 * champion with the specified ID actually exists, and will return an empty list if an invalid ID is specified.
	 *
	 * @return A list of the top 50 players for the specified champion.
	 */
	public List<MasteryScoreEntity> getChampionHighscores(short championId) {
		try (Session session = HighscoresService.getHibernateSessionFactory().openSession()) {
			Query<MasteryScoreEntity> query = session.createQuery("FROM MasteryScoreEntity WHERE championId=:championId AND summoner.status != 1 ORDER BY masteryPoints DESC", MasteryScoreEntity.class)
					.setParameter("championId", championId)
					.setMaxResults(50);

			return query.getResultList();
		}
	}

	/**
	 * Retrieves the {@link MasteryScoreEntity} for the specified summoner and champion from {@code scores} if it already
	 * contains it, or creates a new one if it does not.
	 *
	 * @param scores MasteryScoreEntities for this summoner that have already been persisted to the database, mapped by
	 * 		champion ID.
	 * @param summonerEntity The SummonerEntity who the score belongs to.
	 * @param championId The ID of the champion this score if for.
	 * @param points The points or level the summoner has on this champion.
	 */
	private static MasteryScoreEntity getMasteryScoreEntity(Map<Short, MasteryScoreEntity> scores, SummonerEntity summonerEntity, short championId, int points) {
		MasteryScoreEntity scoreEntity = scores.get(championId);
		if (scoreEntity == null) {
			// There's no need to use an EntityInstantiator since the SummonerEntity row will be locked, ensuring that only 1 thread can access this summoner's scores.
			scoreEntity = new MasteryScoreEntity();
			scoreEntity.setPlatform(summonerEntity.getPlatform());
			scoreEntity.setSummoner(summonerEntity);
			scoreEntity.setChampionId(championId);
		}

		scoreEntity.setMasteryPoints(points);
		return scoreEntity;
	}

	/**
	 * Saves scoreEntity to the database if the summoner has enough points to be in the highscores.
	 *
	 * @param scoreEntity The MasteryScoreEntity to consider saving.
	 * @param session The Hibernate session that should be used to save the entity.
	 */
	private static void considerSaveOrUpdate(MasteryScoreEntity scoreEntity, Session session) {
		if (scoreEntity.getChampionId() == -1) {
			// Only save total mastery points if it's at least 1m.
			if (scoreEntity.getMasteryPoints() < 1000000) {
				return;
			}
		} else if (scoreEntity.getChampionId() == -2) {
			// Only save total mastery level if it's at least 500.
			if (scoreEntity.getMasteryPoints() < 500) {
				return;
			}
		} else {
			// Only save champions with at least 100k mastery points.
			if (scoreEntity.getMasteryPoints() < 100000) {
				return;
			}
		}

		session.saveOrUpdate(scoreEntity);
	}
}