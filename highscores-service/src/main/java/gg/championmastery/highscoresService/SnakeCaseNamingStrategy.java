package gg.championmastery.highscoresService;

import org.hibernate.boot.model.naming.Identifier;
import org.hibernate.boot.model.naming.ImplicitBasicColumnNameSource;
import org.hibernate.boot.model.naming.ImplicitNamingStrategyLegacyHbmImpl;

import java.util.Locale;

import static java.lang.Character.*;

/**
 * Uses snake_case names instead of camelCase.
 */
public class SnakeCaseNamingStrategy extends ImplicitNamingStrategyLegacyHbmImpl {
	@Override
	public Identifier determineBasicColumnName(ImplicitBasicColumnNameSource source) {
		return new Identifier(addUnderscores(source.getAttributePath().getProperty()), false);
	}

	// From https://stackoverflow.com/a/34565182
	private static String addUnderscores(String name) {
		final StringBuilder sb = new StringBuilder(name.replace('.', '_'));
		for (int i = 1; i < sb.length() - 1; i++) {
			if (isLowerCase(sb.charAt(i - 1)) && isUpperCase(sb.charAt(i)) && isLowerCase(sb.charAt(i + 1))) {
				sb.insert(i++, '_');
			}
		}
		return sb.toString().toLowerCase(Locale.ROOT);
	}
}
