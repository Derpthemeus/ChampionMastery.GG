package gg.championmastery.highscoresService.persistence;

import com.merakianalytics.orianna.types.common.Platform;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.Id;
import javax.persistence.IdClass;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.Table;
import javax.persistence.Transient;
import java.io.Serializable;
import java.util.Objects;

@Entity
@Table(name = "mastery_scores")
@IdClass(MasteryScoreEntity.Key.class)
public class MasteryScoreEntity {

	private String platform;
	private SummonerEntity summoner;
	private short championId;
	private int masteryPoints;

	@Column(nullable = false)
	@Id
	public String getPlatform() {
		return platform;
	}

	public void setPlatform(String platform) {
		this.platform = platform;
	}

	@JoinColumn(name = "player_id", referencedColumnName = "player_id")
	@ManyToOne(fetch = FetchType.EAGER)
	@Id
	public SummonerEntity getSummoner() {
		return summoner;
	}

	public void setSummoner(SummonerEntity summoner) {
		this.summoner = summoner;
	}

	@Column(nullable = false)
	@Id
	public short getChampionId() {
		return championId;
	}

	public void setChampionId(short championId) {
		this.championId = championId;
	}

	@Column(nullable = false)
	public int getMasteryPoints() {
		return masteryPoints;
	}

	public void setMasteryPoints(int masteryPoints) {
		this.masteryPoints = masteryPoints;
	}

	@Override
	public String toString() {
		return "MasteryScoreEntity{" +
				"platform='" + platform + '\'' +
				", playerId=" + summoner +
				", championId=" + championId +
				", masteryPoints=" + masteryPoints +
				'}';
	}


	public static class Key implements Serializable {

		private String platform;
		private SummonerEntity summoner;
		private short championId;

		public Key() {
		}

		public String getPlatform() {
			return platform;
		}

		public void setPlatform(String platform) {
			this.platform = platform;
		}

		public SummonerEntity getSummoner() {
			return summoner;
		}

		public void setSummoner(SummonerEntity summoner) {
			this.summoner = summoner;
		}

		public short getChampionId() {
			return championId;
		}

		public void setChampionId(short championId) {
			this.championId = championId;
		}

		@Override
		public boolean equals(Object o) {
			if (this == o) return true;
			if (o == null || getClass() != o.getClass()) return false;
			Key key = (Key) o;
			return Objects.equals(summoner, key.summoner) && championId == key.championId && platform.equals(key.platform);
		}

		@Override
		public int hashCode() {
			return Objects.hash(platform, summoner, championId);
		}
	}
}
