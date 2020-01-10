package gg.championmastery.highscoresService.api.http;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.SerializerProvider;
import com.fasterxml.jackson.databind.ser.std.StdSerializer;
import com.merakianalytics.orianna.types.common.Platform;
import gg.championmastery.highscoresService.persistence.MasteryScoreEntity;

import java.io.IOException;

public class MasteryScoreEntitySerializer extends StdSerializer<MasteryScoreEntity> {

	protected MasteryScoreEntitySerializer() {
		super(MasteryScoreEntity.class);
	}

	@Override
	public void serialize(MasteryScoreEntity entity, JsonGenerator gen, SerializerProvider provider) throws IOException {
		gen.writeStartObject();
		// TODO redact this if necessary.
		gen.writeStringField("name", entity.getSummoner().getSummonerName());
		gen.writeStringField("region", Platform.withTag(entity.getPlatform()).getRegion().getTag());
		gen.writeNumberField("points", entity.getMasteryPoints());
		gen.writeEndObject();
	}
}
