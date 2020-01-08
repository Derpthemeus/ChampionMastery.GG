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

		HandlerCollection handlers = new HandlerCollection(
				summonerScoresHandler
		);

		jettyServer.setHandler(handlers);
		jettyServer.start();
	}
}
