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

public class ChampionHighscoresHandler extends AbstractHandler {

	private final ObjectMapper mapper;

	public ChampionHighscoresHandler() {
		SimpleModule module = new SimpleModule();
		module.addSerializer(new MasteryScoreEntitySerializer());
		mapper = new ObjectMapper();
		mapper.registerModule(module);
	}

	@Override
	public void handle(String target, Request baseRequest, HttpServletRequest request, HttpServletResponse response) throws IOException {
		baseRequest.setHandled(true);

		short championId;
		try {
			championId = Short.parseShort(request.getParameter("championId"));
		} catch (NumberFormatException ex) {
			response.setStatus(400);
			response.getWriter().write("Invalid champion ID");
			return;
		}

		List<MasteryScoreEntity> championHighscores = HighscoresService.getApi().getChampionHighscores(championId);

		mapper.writeValue(response.getWriter(), championHighscores);

		response.setStatus(200);
	}
}
