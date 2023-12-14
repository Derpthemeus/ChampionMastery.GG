package gg.championmastery.highscoresService.api.http;

import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.server.handler.ContextHandler;
import org.eclipse.jetty.server.handler.HandlerCollection;

/**
 * Exposes API methods through HTTP endpoints.
 */
public class HttpApi {
	private final Server jettyServer;

	public HttpApi(int port) throws Exception {
		jettyServer = new Server(port);

		ContextHandler summonerScoresHandler = new ContextHandler("/summonerInfo");
		summonerScoresHandler.setHandler(new SummonerScoresHandler());

		ContextHandler highscoresSummaryHandler = new ContextHandler("/highscoresSummary");
		highscoresSummaryHandler.setHandler(new HighscoresSummaryHandler());

		ContextHandler championHighscoresHandler = new ContextHandler("/championHighscores");
		championHighscoresHandler.setHandler(new ChampionHighscoresHandler());

		ContextHandler playerRefreshHandler = new ContextHandler("/refreshPlayer");
		playerRefreshHandler.setHandler(new PlayerRefreshHandler());

		HandlerCollection handlers = new HandlerCollection(
				summonerScoresHandler, highscoresSummaryHandler, championHighscoresHandler, playerRefreshHandler
		);

		jettyServer.setHandler(handlers);
		jettyServer.start();
	}
}
