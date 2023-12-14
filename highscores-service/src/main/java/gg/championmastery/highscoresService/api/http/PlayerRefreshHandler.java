package gg.championmastery.highscoresService.api.http;

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

/** Refreshes a player in the DB by their PUUID (used by freshness_automation). */
public class PlayerRefreshHandler extends AbstractHandler {
	private static final Logger logger = LoggerFactory.getLogger(PlayerRefreshHandler.class);

	@Override
	public void handle(String target, Request baseRequest, HttpServletRequest request, HttpServletResponse response) throws IOException {
		baseRequest.setHandled(true);
		String puuid = request.getParameter("puuid");
		if (puuid == null) {
			response.setStatus(400);
			response.setContentType("text/plain");
			response.getWriter().write("puuid parameter not specified");
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
					"puuid", puuid
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

		String riotId = account.getGameName() + " #" + account.getTagLine();
		try {
			HighscoresService.getApi().getSummonerScores(summoner, riotId);
		} catch (OriannaException ex) {
			sendOriannaError(ex, response);
			return;
		}

		response.setStatus(200);
		response.setContentType("text/plain");
		response.getWriter().write(String.format("Refreshed %s (%s)", riotId, platform.getTag()));
	}

	private static void sendOriannaError(OriannaException ex, HttpServletResponse response) throws IOException {
		response.getWriter().write(String.format("Orianna threw (%s).", ex.getClass().getName()));
	}
}
