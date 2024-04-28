package gg.championmastery.highscoresService;

import com.merakianalytics.datapipelines.DataPipeline;
import com.merakianalytics.orianna.Orianna;
import gg.championmastery.highscoresService.api.HighscoresApi;
import gg.championmastery.highscoresService.api.http.HttpApi;
import io.prometheus.client.exporter.HTTPServer;
import io.prometheus.client.hibernate.HibernateStatisticsCollector;
import io.prometheus.client.hotspot.DefaultExports;
import org.hibernate.SessionFactory;
import org.hibernate.cfg.Configuration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class HighscoresService {

	public static int CHAMPION_HIGHSCORES_LENGTH = 50;
	private static SessionFactory hibernateSessionFactory;
	private static final Logger logger = LoggerFactory.getLogger(HighscoresService.class);
	private static HighscoresApi highscoresApi;

	public static void main(String[] args) throws Exception {
		logger.info("Starting highscores service...");

		// Make sure all environment variables are defined.
		for (String key : new String[]{"MYSQL_CONNECTION_URL", "RIOT_API_KEY"}) {
			if (System.getenv(key) == null) {
				logger.error(String.format("CRITICAL ERROR: environment variable '%s' is not defined", key));
				System.exit(1);
			}
		}

		Configuration hibernateConfig = new Configuration()
				.configure()
				.setProperty("hibernate.connection.url", System.getenv("MYSQL_CONNECTION_URL"));
		hibernateConfig.setImplicitNamingStrategy(new SnakeCaseNamingStrategy());

		hibernateSessionFactory = hibernateConfig.buildSessionFactory();

		Orianna.setRiotAPIKey(System.getenv("RIOT_API_KEY"));

		highscoresApi = new HighscoresApi();
		HttpApi httpApi = new HttpApi(8181);

		logger.info("Initializing Prometheus metrics exporter...");
		DefaultExports.initialize();
		new HibernateStatisticsCollector().add(hibernateSessionFactory, "main").register();
		new HTTPServer(9000);

		logger.info("Finished startup sequence");
	}

	public static SessionFactory getHibernateSessionFactory() {
		return hibernateSessionFactory;
	}

	public static DataPipeline getOriannaPipeline() {
		return Orianna.getSettings().getPipeline();
	}

	public static HighscoresApi getApi() {
		return highscoresApi;
	}
}
