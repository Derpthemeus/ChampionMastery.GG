package gg.championmastery.highscoresService.api.http;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.module.SimpleModule;
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

	private final ObjectMapper mapper;

	public HighscoresSummaryHandler() {
		SimpleModule module = new SimpleModule();
		module.addSerializer(new MasteryScoreEntitySerializer());
		mapper = new ObjectMapper();
		mapper.registerModule(module);
	}

	@Override
	public void handle(String target, Request baseRequest, HttpServletRequest request, HttpServletResponse response) throws IOException {
		baseRequest.setHandled(true);

		Map<Short, List<MasteryScoreEntity>> highscoresSummary = HighscoresService.getApi().getHighscoresSummary();

		mapper.writeValue(response.getWriter(), highscoresSummary);

		response.setStatus(200);
	}
}
