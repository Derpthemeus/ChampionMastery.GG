package gg.championmastery.highscoresService;

import java.io.Serializable;

/**
 * Represents a Hibernate entity.
 *
 * @param <K> The class used for the primary key of the entity.
 */
public interface HibernateEntity<K extends Serializable> {

	/**
	 * Returns the value of this entity's primary key.
	 *
	 * @return The value of this entity's primary key.
	 */
	K getIdentifier();
}
