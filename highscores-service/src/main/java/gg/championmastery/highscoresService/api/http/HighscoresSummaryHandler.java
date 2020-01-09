package gg.championmastery.highscoresService.api.http;

import com.fasterxml.jackson.databind.ObjectMapper;
import gg.championmastery.highscoresService.HighscoresService;
import gg.championmastery.highscoresService.persistence.MasteryScoreEntity;
import org.eclipse.jetty.server.Request;
import org.eclipse.jetty.server.handler.AbstractHandler;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import java.util.Map;

public class HighscoresSummaryHandler extends AbstractHandler {

	@Override
	public void handle(String target, Request baseRequest, HttpServletRequest request, HttpServletResponse response) throws IOException {
		baseRequest.setHandled(true);

		Map<Short, List<MasteryScoreEntity>> highscoresSummary = HighscoresService.getApi().getHighscoresSummary();

		ObjectMapper mapper = new ObjectMapper();
		// FIXME serialize Instants as epoch timestamps.
		// mapper.configure(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS, true);
		mapper.writeValue(response.getWriter(), highscoresSummary);

		response.setStatus(200);
	}
}
