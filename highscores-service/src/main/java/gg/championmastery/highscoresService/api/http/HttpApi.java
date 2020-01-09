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

		ContextHandler summonerScoresHandler = new ContextHandler("/summonerScores");
		summonerScoresHandler.setHandler(new SummonerScoresHandler());

		ContextHandler highscoresSummaryHandler = new ContextHandler("/highscoresSummary");
		highscoresSummaryHandler.setHandler(new HighscoresSummaryHandler());

		HandlerCollection handlers = new HandlerCollection(
				summonerScoresHandler, highscoresSummaryHandler
		);

		jettyServer.setHandler(handlers);
		jettyServer.start();
	}
}
