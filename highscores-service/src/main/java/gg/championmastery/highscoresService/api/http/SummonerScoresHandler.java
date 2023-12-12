package gg.championmastery.highscoresService.api.http;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.google.common.collect.ImmutableMap;
import com.merakianalytics.orianna.datapipeline.riotapi.exceptions.BadRequestException;
import com.merakianalytics.orianna.datapipeline.riotapi.exceptions.ForbiddenException;
import com.merakianalytics.orianna.datapipeline.riotapi.exceptions.InternalServerErrorException;
import com.merakianalytics.orianna.datapipeline.riotapi.exceptions.NotFoundException;
import com.merakianalytics.orianna.datapipeline.riotapi.exceptions.RateLimitExceededException;
import com.merakianalytics.orianna.datapipeline.riotapi.exceptions.ServiceUnavailableException;
import com.merakianalytics.orianna.datapipeline.riotapi.exceptions.UnauthorizedException;
import com.merakianalytics.orianna.datapipeline.riotapi.exceptions.UnsupportedMediaTypeException;
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
import java.util.HashMap;
import java.util.Map;

public class SummonerScoresHandler extends AbstractHandler {

	private static final Map<Class<? extends OriannaException>, Integer> errorCodes = new HashMap<Class<? extends OriannaException>, Integer>() {{
		put(BadRequestException.class, 400);
		put(ForbiddenException.class, 403);
		put(InternalServerErrorException.class, 500);
		put(NotFoundException.class, 404);
		put(RateLimitExceededException.class, 429);
		put(ServiceUnavailableException.class, 503);
		put(UnauthorizedException.class, 403);
		put(UnsupportedMediaTypeException.class, 415);
	}};

	private static final Logger logger = LoggerFactory.getLogger(SummonerScoresHandler.class);

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

		Summoner summoner;
		try {
			summoner = HighscoresService.getOriannaPipeline().get(Summoner.class, ImmutableMap.of(
					"platform", platform,
					"name", summonerName
			));
		} catch (OriannaException ex) {
			sendOriannaError(ex, response);
			return;
		}
		if (summoner == null) {
			response.setStatus(404);
			response.setContentType("text/plain");
			response.getWriter().write("Summoner does not exist");
			return;
		}

		// TODO page load times could be significantly improved by fetching account and masteries from API in parallel,
		//  then sending the response before asynchronously updating the database.
		Account account;
		try {
			account = HighscoresService.getOriannaPipeline().get(Account.class, ImmutableMap.of(
					"puuid", summoner.getPuuid(),
					"platform", platform
			));
		} catch (OriannaException ex) {
			sendOriannaError(ex, response);
			return;
		}
		if (account == null) {
			response.setStatus(404);
			response.setContentType("text/plain");
			response.getWriter().write("Riot Account does not exist");
			logger.error("Could not find account for PUUID {}", summoner.getPuuid());
			return;
		}

		ChampionMasteries summonerScores;
		try {
			summonerScores = HighscoresService.getApi().getSummonerScores(summoner, account.getGameName() + " #" + account.getTagLine());
		} catch (OriannaException ex) {
			sendOriannaError(ex, response);
			return;
		}

		ObjectNode node = mapper.createObjectNode();
		node.setAll(mapper.convertValue(summoner, ObjectNode.class));
		node.set("scores", mapper.convertValue(summonerScores, JsonNode.class));

		response.setStatus(200);
		response.setContentType("text/json");
		mapper.writeValue(response.getWriter(), node);
	}

	/**
	 * Responds to a request with an error message indicating that an OriannaException was thrown. If the exception was
	 * thrown because the Riot API returned an error and the HTTP status code of the original error can be determined,
	 * the status code of the response will be set to the same code. Otherwise, the code will be set to 500.
	 * @param ex The OriannaException that was caught.
	 * @param response The response to send the error through.
	 * @throws IOException Thrown if an error occurs while writing the response.
	 */
	private static void sendOriannaError(OriannaException ex, HttpServletResponse response) throws IOException {
		Integer code = errorCodes.get(ex.getClass());

		if (code == null) {
			response.setStatus(500);
			response.setContentType("text/plain");
			response.getWriter().write(String.format("An Orianna error occurred (%s).", ex.getClass().getName()));
		} else {
			response.setStatus(code);
			response.setContentType("text/plain");
			response.getWriter().write("A Riot API error occurred.");
		}
	}
}
