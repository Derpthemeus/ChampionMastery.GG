package gg.championmastery.highscoresService.api.http;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.collect.ImmutableMap;
import com.merakianalytics.orianna.types.common.Platform;
import com.merakianalytics.orianna.types.dto.championmastery.ChampionMasteries;
import com.merakianalytics.orianna.types.dto.summoner.Summoner;
import gg.championmastery.highscoresService.HighscoresService;
import org.eclipse.jetty.server.Request;
import org.eclipse.jetty.server.handler.AbstractHandler;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Map;

public class SummonerScoresHandler extends AbstractHandler {

	private final ObjectMapper mapper;

	public SummonerScoresHandler() {
		mapper = new ObjectMapper();
	}

	@Override
	public void handle(String target, Request baseRequest, HttpServletRequest request, HttpServletResponse response) throws IOException {
		baseRequest.setHandled(true);
		String summonerName = request.getParameter("summonerName");
		if (summonerName == null) {
			response.setStatus(400);
			response.setContentType("text/plain");
			response.getWriter().write("summonerName parameter not specified");
			return;
		}

		Platform platform = Platform.withTag(request.getParameter("platform"));
		if (platform == null) {
			response.setStatus(400);
			response.setContentType("text/plain");
			response.getWriter().write("Invalid platform");
			return;
		}

		Summoner summoner = HighscoresService.getOriannaPipeline().get(Summoner.class, ImmutableMap.of(
				"platform", platform,
				"name", summonerName
		));

		if (summoner == null) {
			response.setStatus(404);
			response.setContentType("text/plain");
			response.getWriter().write("Summoner does not exist");
			return;
		}

		ChampionMasteries summonerScores = HighscoresService.getApi().getSummonerScores(summoner);

		Map<String, Object> map = ImmutableMap.of(
				"summoner", summoner,
				"scores", summonerScores
		);


		response.setStatus(200);
		response.setContentType("text/json");
		mapper.writeValue(response.getWriter(), map);
	}
}
