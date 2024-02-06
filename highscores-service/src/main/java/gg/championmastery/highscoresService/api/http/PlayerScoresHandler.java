package gg.championmastery.highscoresService.api.http;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.google.common.collect.ImmutableMap;
import com.merakianalytics.orianna.types.common.OriannaException;
import com.merakianalytics.orianna.types.common.Platform;
import com.merakianalytics.orianna.types.dto.account.Account;
import com.merakianalytics.orianna.types.dto.championmastery.ChampionMasteries;
import com.merakianalytics.orianna.types.dto.summoner.Summoner;
import gg.championmastery.highscoresService.HighscoresService;
import org.eclipse.jetty.server.Request;
import org.eclipse.jetty.server.handler.AbstractHandler;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.URLDecoder;

public class PlayerScoresHandler extends AbstractHandler {
	private static final Logger logger = LoggerFactory.getLogger(PlayerScoresHandler.class);

	private final ObjectMapper mapper;

	public PlayerScoresHandler() {
		mapper = new ObjectMapper();
	}

	@Override
	public void handle(String target, Request baseRequest, HttpServletRequest request, HttpServletResponse response) throws IOException {
		baseRequest.setHandled(true);
		String riotId = request.getParameter("riotId");
		if (riotId == null) {
			response.setStatus(400);
			response.setContentType("text/plain");
			response.getWriter().write("riotId parameter not specified");
			return;
		}
		riotId = URLDecoder.decode(riotId, "UTF-8");

		Platform platform = Platform.withTag(request.getParameter("platform"));
		if (platform == null) {
			response.setStatus(400);
			response.setContentType("text/plain");
			response.getWriter().write(String.format("Invalid platform '%s'", request.getParameter("platform")));
			return;
		}

		String[] splitRiotId = riotId.split("#");
		if (splitRiotId.length != 2) {
			response.setStatus(400);
			response.setContentType("text/plain");
			response.getWriter().write(String.format("Invalid Riot ID '%s'", riotId));
			return;
		}
		String gameName = splitRiotId[0];
		String tagLine = splitRiotId[1];
		Account account;
		Summoner summoner;
		try {
			account = HighscoresService.getOriannaPipeline().get(Account.class, ImmutableMap.of(
					"platform", platform,
					"gameName", gameName,
					"tagLine", tagLine
			));
			if (account == null) {
				response.setStatus(404);
				response.setContentType("text/plain");
				response.getWriter().write("Account does not exist");
				return;
			}

			summoner = HighscoresService.getOriannaPipeline().get(Summoner.class, ImmutableMap.of(
					"platform", platform,
					"puuid", account.getPuuid()
			));
		} catch (OriannaException ex) {
			HttpApi.sendOriannaError(ex, response);
			return;
		}

		if (summoner == null) {
			response.setStatus(404);
			response.setContentType("text/plain");
			logger.error("Summoner does not exist for PUUID '{}'", account.getPuuid());
			response.getWriter().write("Summoner does not exist");
			return;
		}

		riotId = account.getGameName() + " #" + account.getTagLine();
		ChampionMasteries summonerScores;
		try {
			summonerScores = HighscoresService.getApi().getSummonerScores(summoner, riotId);
		} catch (OriannaException ex) {
			HttpApi.sendOriannaError(ex, response);
			return;
		}

		ObjectNode node = mapper.createObjectNode();
		node.setAll(mapper.convertValue(summoner, ObjectNode.class));
		node.set("scores", mapper.convertValue(summonerScores, JsonNode.class));
		node.set("riotId", mapper.convertValue(riotId, JsonNode.class));

		response.setStatus(200);
		response.setContentType("text/json");
		mapper.writeValue(response.getWriter(), node);
	}
}
