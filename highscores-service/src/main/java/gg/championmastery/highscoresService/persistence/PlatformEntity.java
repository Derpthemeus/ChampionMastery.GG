package gg.championmastery.highscoresService.persistence;

import com.merakianalytics.orianna.types.common.Platform;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.Table;
import javax.persistence.Transient;

@Entity
@Table(name = "platforms")
public class PlatformEntity {

	private int ordinal;
	private String platformId;
	private String regionId;

	@Column(nullable = false)
	public int getOrdinal() {
		return ordinal;
	}

	public void setOrdinal(int ordinal) {
		this.ordinal = ordinal;
	}

	@Column(nullable = false)
	@Id
	public String getPlatformId() {
		return platformId;
	}

	public void setPlatformId(String platformId) {
		this.platformId = platformId;
	}

	@Column(nullable = false)
	public String getRegionId() {
		return regionId;
	}

	public void setRegionId(String regionId) {
		this.regionId = regionId;
	}

	@Transient
	public Platform getOriannaPlatform() {
		return Platform.withTag(platformId);
	}

	@Transient
	public void setOriannaPlatform(Platform platform) {
		setPlatformId(platform.getTag());
	}

	@Override
	public String toString() {
		return "PlatformEntity{" +
				", ordinal=" + ordinal +
				", platformId='" + platformId + '\'' +
				", regionId='" + regionId + '\'' +
				'}';
	}
}
