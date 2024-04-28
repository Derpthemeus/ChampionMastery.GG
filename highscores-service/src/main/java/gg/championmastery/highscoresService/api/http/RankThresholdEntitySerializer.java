package gg.championmastery.highscoresService.api.http;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.SerializerProvider;
import com.fasterxml.jackson.databind.ser.std.StdSerializer;
import gg.championmastery.highscoresService.persistence.RankThresholdEntity;

import java.io.IOException;

public class RankThresholdEntitySerializer extends StdSerializer<RankThresholdEntity> {

	protected RankThresholdEntitySerializer() {
		super(RankThresholdEntity.class);
	}

	@Override
	public void serialize(RankThresholdEntity entity, JsonGenerator gen, SerializerProvider provider) throws IOException {
		gen.writeStartObject();
		gen.writeNumberField("masteryPoints", entity.getMasteryPoints());
		gen.writeNumberField("championId", entity.getChampionId());
		gen.writeNumberField("rank", entity.getRank());
		gen.writeEndObject();
	}
}
