package gg.championmastery.highscoresService.persistence;

import gg.championmastery.highscoresService.EntityInstantiator;
import gg.championmastery.highscoresService.HibernateEntity;
import org.hibernate.annotations.Generated;
import org.hibernate.annotations.GenerationTime;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.EnumType;
import javax.persistence.Enumerated;
import javax.persistence.FetchType;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.IdClass;
import javax.persistence.JoinColumn;
import javax.persistence.OneToMany;
import javax.persistence.Table;
import javax.persistence.Transient;
import java.io.Serializable;
import java.time.Instant;
import java.util.List;
import java.util.Objects;

@Entity
@Table(name = "summoners")
@IdClass(SummonerEntity.Key.class)
public class SummonerEntity implements HibernateEntity<SummonerEntity.Key>, Serializable {

	/** The smallest possible value of a DATETIME in MySQL. */
	private static final Instant DEFAULT_INSTANT = Instant.ofEpochSecond(1);
	private static SummonerInstantiator instantiator = new SummonerInstantiator();
	private long playerId;
	private String platform;
	private String encryptedPuuid;
	private String encryptedAccountId;
	private String encryptedSummonerId;
	private String summonerName;
	private String standardizedName;
	private Instant revisionDateInstant;
	private Instant nameLastUpdatedInstant = DEFAULT_INSTANT;
	private Instant masteriesLastUpdatedInstant = DEFAULT_INSTANT;
	private Status status = Status.NORMAL;
	private List<MasteryScoreEntity> masteryScores;

	@Column(nullable = false)
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Generated(GenerationTime.INSERT)
	public long getPlayerId() {
		return playerId;
	}

	public void setPlayerId(long playerId) {
		this.playerId = playerId;
	}

	@Column(nullable = false)
	@Id
	public String getPlatform() {
		return platform;
	}

	public void setPlatform(String platform) {
		this.platform = platform;
	}

	@Column(nullable = true)
	public String getEncryptedPuuid() {
		return encryptedPuuid;
	}

	public void setEncryptedPuuid(String encryptedPuuid) {
		this.encryptedPuuid = encryptedPuuid;
	}

	@Column(nullable = false)
	@Id
	public String getEncryptedSummonerId() {
		return encryptedSummonerId;
	}

	public void setEncryptedSummonerId(String summonerId) {
		this.encryptedSummonerId = summonerId;
	}

	@Column(nullable = false)
	public String getEncryptedAccountId() {
		return encryptedAccountId;
	}

	public void setEncryptedAccountId(String accountId) {
		this.encryptedAccountId = accountId;
	}

	@Column(nullable = false)
	public String getSummonerName() {
		return summonerName;
	}

	public void setSummonerName(String summonerName) {
		this.summonerName = summonerName;
		this.standardizedName = standardizeName(summonerName);
	}

	public String getStandardizedName() {
		return standardizedName;
	}

	private void setStandardizedName(String standardizedName) {
		this.standardizedName = standardizedName;
	}

	@Column(name = "revision_date", nullable = false)
	public Instant getRevisionDateInstant() {
		return revisionDateInstant;
	}

	public void setRevisionDateInstant(Instant revisionDateInstant) {
		this.revisionDateInstant = revisionDateInstant;
	}

	@Column(name = "name_last_updated", nullable = false)
	public Instant getNameLastUpdatedInstant() {
		return nameLastUpdatedInstant;
	}

	public void setNameLastUpdatedInstant(Instant nameLastUpdatedInstant) {
		this.nameLastUpdatedInstant = nameLastUpdatedInstant;
	}

	@Column(name = "masteries_last_updated", nullable = false)
	public Instant getMasteriesLastUpdatedInstant() {
		return masteriesLastUpdatedInstant;
	}

	public void setMasteriesLastUpdatedInstant(Instant masteriesLastUpdatedInstant) {
		this.masteriesLastUpdatedInstant = masteriesLastUpdatedInstant;
	}

	@Column(name = "summoner_status", nullable = false)
	@Enumerated(EnumType.ORDINAL)
	public Status getStatus() {
		return status;
	}

	public void setStatus(Status status) {
		this.status = status;
	}

	@JoinColumn(name = "player_id", referencedColumnName = "player_id")
	@OneToMany(fetch = FetchType.LAZY)
	@Transient
	private List<MasteryScoreEntity> getMasteryScores() {
		return masteryScores;
	}

	public void setMasteryScores(List<MasteryScoreEntity> masteryScores) {
		this.masteryScores = masteryScores;
	}

	/**
	 * Returns the player's summoner name, or {@code null} if they have requested not to have their name shown on the
	 * site.
	 *
	 * @return The player's summoner name, or {@code null} if they have requested not to have their name shown on the
	 * 		site.
	 */
	@Transient
	public String getDisplayName() {
		if (getStatus() == Status.FORGOTTEN || getStatus() == Status.REQUESTED_REMOVAL) {
			return null;
		} else {
			return getSummonerName();
		}
	}

	@Override
	@Transient
	public Key getIdentifier() {
		return new Key(getPlatform(), getEncryptedSummonerId());
	}

	@Override
	public String toString() {
		return "SummonerEntity{" +
				"playerId=" + playerId +
				", platform='" + platform + '\'' +
				", encryptedPuuid='" + encryptedPuuid + '\'' +
				", encryptedAccountId='" + encryptedAccountId + '\'' +
				", encryptedSummonerId='" + encryptedSummonerId + '\'' +
				", summonerName='" + summonerName + '\'' +
				", revisionDateInstant=" + revisionDateInstant +
				", nameLastUpdatedInstant=" + nameLastUpdatedInstant +
				", masteriesLastUpdatedInstant=" + masteriesLastUpdatedInstant +
				", status=" + status +
				", masteryScores=" + masteryScores +
				'}';
	}

	public static String standardizeName(String name) {
		return name.replaceAll(" ", "").toLowerCase();
	}

	public static SummonerInstantiator getInstantiator() {
		return instantiator;
	}


	/**
	 * A status describing how the player should be displayed on the highscores. Players with a {@link #TRANSFERRED}
	 * status will be omitted from highscores, and players with a {@link #FORGOTTEN} or {@link #REQUESTED_REMOVAL}
	 * status will have their summoner name redacted.
	 * <p>
	 * In the event that multiple abnormal statuses apply to a single summoner, the highest priority applicable status
	 * will be used. From highest to lowest priority, the statuses are {@link #TRANSFERRED}, {@link #FORGOTTEN}, {@link
	 * #REQUESTED_REMOVAL}, {@link #NORMAL}.
	 */
	public enum Status {

		NORMAL(),
		/**
		 * Indicates that this account has been transferred to a different server and should not be listed on the
		 * highscores.
		 */
		TRANSFERRED(),
		/** Indicates that this player has requested not to be listed on CMGG. */
		REQUESTED_REMOVAL(),
		/** Indicates that this player has exercised their right to be forgotten through Riot Games. */
		FORGOTTEN()
	}


	public static class Key implements Serializable {

		private String platform;
		private String encryptedSummonerId;

		public Key() {
		}

		public Key(String platform, String encryptedSummonerId) {
			this.platform = platform;
			this.encryptedSummonerId = encryptedSummonerId;
		}

		public String getPlatform() {
			return this.platform;
		}

		public void setPlatform(String platform) {
			this.platform = platform;
		}

		public String getEncryptedSummonerId() {
			return this.encryptedSummonerId;
		}

		public void setEncryptedSummonerId(String encryptedSummonerId) {
			this.encryptedSummonerId = encryptedSummonerId;
		}

		@Override
		public int hashCode() {
			return Objects.hash(platform, encryptedSummonerId);
		}

		@Override
		public boolean equals(Object o) {
			if (this == o) {
				return true;
			}
			if (o == null || getClass() != o.getClass()) {
				return false;
			}
			Key that = (Key) o;
			return platform.equals(that.platform) && Objects.equals(encryptedSummonerId, that.encryptedSummonerId);
		}
	}


	public static class SummonerInstantiator extends EntityInstantiator<SummonerEntity, Key> {

		SummonerInstantiator() {
			super(SummonerEntity.class);
		}

		@Override
		protected SummonerEntity instantiateEntity(SummonerEntity.Key key) {
			SummonerEntity entity = new SummonerEntity();
			entity.setPlatform(key.getPlatform());
			entity.setEncryptedSummonerId(key.getEncryptedSummonerId());
			return entity;
		}
	}
}
