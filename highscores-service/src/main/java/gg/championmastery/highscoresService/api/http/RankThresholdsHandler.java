package gg.championmastery.highscoresService.api.http;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.module.SimpleModule;
import gg.championmastery.highscoresService.HighscoresService;
import gg.championmastery.highscoresService.persistence.RankThresholdEntity;
import org.eclipse.jetty.server.Request;
import org.eclipse.jetty.server.handler.AbstractHandler;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;

public class RankThresholdsHandler extends AbstractHandler {

	private final ObjectMapper mapper;

	public RankThresholdsHandler() {
		SimpleModule module = new SimpleModule();
		module.addSerializer(new RankThresholdEntitySerializer());
		mapper = new ObjectMapper();
		mapper.registerModule(module);
	}

	@Override
	public void handle(String target, Request baseRequest, HttpServletRequest request, HttpServletResponse response) throws IOException {
		baseRequest.setHandled(true);
		List<RankThresholdEntity> thresholds = HighscoresService.getApi().getRankThresholds();
		response.setStatus(200);
		response.setContentType("text/json");
		mapper.writeValue(response.getWriter(), thresholds);
	}
}
