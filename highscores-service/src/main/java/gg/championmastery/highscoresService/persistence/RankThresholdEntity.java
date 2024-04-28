package gg.championmastery.highscoresService.persistence;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.IdClass;
import javax.persistence.Table;
import java.io.Serializable;
import java.util.Objects;

@Entity
@Table(name = "rank_thresholds")
@IdClass(RankThresholdEntity.Key.class)
public class RankThresholdEntity {
	private short championId;
	private int masteryPoints;
	private int rank;

	@Column(nullable = false)
	@Id
	public short getChampionId() {
		return championId;
	}

	public void setChampionId(short championId) {
		this.championId = championId;
	}

	@Column(nullable = false)
	@Id
	public int getRank() {
		return rank;
	}

	public void setRank(int rank) {
		this.rank = rank;
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
		return "RankThresholdEntity{" +
				"championId=" + championId +
				", rank=" + rank +
				", masteryPoints=" + masteryPoints +
				'}';
	}



	public static class Key implements Serializable {

		private short championId;
		private int rank;

		public Key() {
		}

		public short getChampionId() {
			return championId;
		}

		public void setChampionId(short championId) {
			this.championId = championId;
		}

		public int getRank() {
			return rank;
		}

		public void setRank(int rank) {
			this.rank = rank;
		}


		@Override
		public boolean equals(Object o) {
			if (this == o) return true;
			if (o == null || getClass() != o.getClass()) return false;
			Key key = (Key) o;
			return championId == key.championId && rank == key.rank;
		}

		@Override
		public int hashCode() {
			return Objects.hash(championId, rank);
		}
	}
}
