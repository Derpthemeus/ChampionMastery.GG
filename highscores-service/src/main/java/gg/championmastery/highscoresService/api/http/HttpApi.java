package gg.championmastery.highscoresService.api.http;

import com.merakianalytics.orianna.datapipeline.riotapi.exceptions.BadRequestException;
import com.merakianalytics.orianna.datapipeline.riotapi.exceptions.ForbiddenException;
import com.merakianalytics.orianna.datapipeline.riotapi.exceptions.InternalServerErrorException;
import com.merakianalytics.orianna.datapipeline.riotapi.exceptions.NotFoundException;
import com.merakianalytics.orianna.datapipeline.riotapi.exceptions.RateLimitExceededException;
import com.merakianalytics.orianna.datapipeline.riotapi.exceptions.ServiceUnavailableException;
import com.merakianalytics.orianna.datapipeline.riotapi.exceptions.UnauthorizedException;
import com.merakianalytics.orianna.datapipeline.riotapi.exceptions.UnsupportedMediaTypeException;
import com.merakianalytics.orianna.types.common.OriannaException;
import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.server.handler.ContextHandler;
import org.eclipse.jetty.server.handler.HandlerCollection;

import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

/**
 * Exposes API methods through HTTP endpoints.
 */
public class HttpApi {
	private final Server jettyServer;

	public HttpApi(int port) throws Exception {
		jettyServer = new Server(port);

		ContextHandler summonerScoresHandler = new ContextHandler("/summonerInfo");
		summonerScoresHandler.setHandler(new PlayerScoresHandler());

		ContextHandler highscoresSummaryHandler = new ContextHandler("/highscoresSummary");
		highscoresSummaryHandler.setHandler(new HighscoresSummaryHandler());

		ContextHandler championHighscoresHandler = new ContextHandler("/championHighscores");
		championHighscoresHandler.setHandler(new ChampionHighscoresHandler());

		ContextHandler playerRefreshHandler = new ContextHandler("/refreshPlayer");
		playerRefreshHandler.setHandler(new PlayerRefreshHandler());

		ContextHandler summonerNameHandler = new ContextHandler("/convertSummonerName");
		summonerNameHandler.setHandler(new SummonerNameHandler());

		HandlerCollection handlers = new HandlerCollection(
				summonerScoresHandler, highscoresSummaryHandler, championHighscoresHandler, playerRefreshHandler, summonerNameHandler
		);

		jettyServer.setHandler(handlers);
		jettyServer.start();
	}

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

	/**
	 * Responds to a request with an error message indicating that an OriannaException was thrown. If the exception was
	 * thrown because the Riot API returned an error and the HTTP status code of the original error can be determined,
	 * the status code of the response will be set to the same code. Otherwise, the code will be set to 500.
	 *
	 * @param ex The OriannaException that was caught.
	 * @param response The response to send the error through.
	 * @throws IOException Thrown if an error occurs while writing the response.
	 */
	static void sendOriannaError(OriannaException ex, HttpServletResponse response) throws IOException {
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
