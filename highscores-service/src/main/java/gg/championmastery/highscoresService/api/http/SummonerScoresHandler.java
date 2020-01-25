package gg.championmastery.highscoresService.api.http;

import com.fasterxml.jackson.databind.ObjectMapper;
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
import com.merakianalytics.orianna.types.dto.championmastery.ChampionMasteries;
import com.merakianalytics.orianna.types.dto.summoner.Summoner;
import gg.championmastery.highscoresService.HighscoresService;
import gg.championmastery.highscoresService.persistence.SummonerEntity;
import org.eclipse.jetty.server.Request;
import org.eclipse.jetty.server.handler.AbstractHandler;
import org.hibernate.Session;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.HashMap;
import java.util.List;
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

		boolean hasNewName = false;
		if (summoner == null) {
			// If the summoner can't be found, check if they changed their name and their old name is still in the database.
			try (Session session = HighscoresService.getHibernateSessionFactory().openSession()) {
				List<SummonerEntity> entities = session.createQuery("FROM SummonerEntity WHERE platform=:platform AND standardizedName=:standardizedName ORDER BY nameLastUpdatedInstant DESC", SummonerEntity.class)
						.setParameter("platform", platform.getTag())
						.setParameter("standardizedName", SummonerEntity.standardizeName(summonerName))
						// Multiple players may be listed with the same name if they haven't been updated recently.
						.getResultList();

				if (entities.size() == 0) {
					// The player really doesn't exist.
					response.setStatus(404);
					response.setContentType("text/plain");
					response.getWriter().write("Summoner does not exist");
					return;
				}

				// Try to find the summoner by their ID from the database.
				summoner = HighscoresService.getOriannaPipeline().get(Summoner.class, ImmutableMap.of(
						"platform", platform,
						"id", entities.get(0).getEncryptedSummonerId()
				));
				hasNewName = true;
			} catch (Exception ex) {
				response.setStatus(500);
				response.setContentType("text/plain");
				response.getWriter().write("Error recovering summoner name");
				return;
			}
		}

		ChampionMasteries summonerScores;
		try {
			summonerScores = HighscoresService.getApi().getSummonerScores(summoner);
		} catch (OriannaException ex) {
			sendOriannaError(ex, response);
			return;
		}

		Map<String, Object> map = ImmutableMap.of(
				"summoner", summoner,
				"scores", summonerScores,
				"hasNewName", hasNewName
		);

		response.setStatus(200);
		response.setContentType("text/json");
		mapper.writeValue(response.getWriter(), map);
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
