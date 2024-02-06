package gg.championmastery.highscoresService.api.http;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.google.common.collect.ImmutableMap;
import com.merakianalytics.orianna.types.common.OriannaException;
import com.merakianalytics.orianna.types.common.Platform;
import com.merakianalytics.orianna.types.dto.account.Account;
import com.merakianalytics.orianna.types.dto.summoner.Summoner;
import gg.championmastery.highscoresService.HighscoresService;
import org.eclipse.jetty.server.Request;
import org.eclipse.jetty.server.handler.AbstractHandler;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

public class SummonerNameHandler extends AbstractHandler {
	private static final Logger logger = LoggerFactory.getLogger(SummonerNameHandler.class);

	private final ObjectMapper mapper;

	public SummonerNameHandler() {
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

		Account account;
		try {
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

			account = HighscoresService.getOriannaPipeline().get(Account.class, ImmutableMap.of(
					"puuid", summoner.getPuuid(),
					"platform", platform
			));
			if (account == null) {
				response.setStatus(404);
				response.setContentType("text/plain");
				logger.error("Could not find account for PUUID %s", summoner.getPuuid());
				response.getWriter().write("Account does not exist");
			}
		} catch (OriannaException ex) {
			HttpApi.sendOriannaError(ex, response);
			return;
		}

		ObjectNode node = mapper.createObjectNode();
		node.setAll(mapper.convertValue(account, ObjectNode.class));

		response.setStatus(200);
		response.setContentType("text/json");
		mapper.writeValue(response.getWriter(), node);
	}
}
