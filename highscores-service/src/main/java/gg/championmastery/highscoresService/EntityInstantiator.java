package gg.championmastery.highscoresService;

import org.hibernate.Session;

import java.io.Serializable;
import java.util.Collection;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

/**
 * This class is used to instantiate subclasses of {@link HibernateEntity}. It is designed to ensure that 2 different
 * entities with the same ID (primary key) will never be instantiated, even in a multi-threaded environment. When an
 * entity is instantiated through this class, its ID will be added to a list of pending IDs before checking that an
 * entity with the specified ID has not already been persisted. Any time an attempt is made to instantiate an entity
 * with an ID that is already listed as a pending entity or that has already been persisted, the attempt will fail. This
 * ensures that between the time an entity is instantiated and the time it is persisted to the database, no other thread
 * can create another entity with the same ID.
 * <p>
 * For this class to work correctly, ALL entities of type {@link K} must be instantiated through this class.
 *
 * @param <T> The type of entity this class instantiates.
 * @param <K> The ID class used by the entity.
 */
public abstract class EntityInstantiator<T extends HibernateEntity<K>, K extends Serializable> {

	private final Class<T> clazz;
	/** IDs of entities which have been created but not yet persisted. */
	private final Set<K> pendingIds = Collections.synchronizedSet(new HashSet<>());

	/**
	 * @param clazz The class of the entity that this class will instantiate.
	 */
	protected EntityInstantiator(Class<T> clazz) {
		this.clazz = clazz;
	}

	/**
	 * Returns a new entity initialized by {@link #instantiateEntity(Serializable)} (if an entity with the specified ID
	 * does not already exist), or {@code null} (if an entity with this ID already exists).
	 * <p>
	 * The caller must call either {@link #persistEntity(Serializable)} or {@link #persistEntities(Collection)} with the
	 * ID of the acquired entity (if it isn't null) once the entity has been saved. If it fails to do so, future
	 * attempts to acquire the same entity will always fail.
	 *
	 * @param id The ID of the entity to attempt to create.
	 * @return A new entity initialized by {@link #instantiateEntity(Serializable)} if an entity with the specified ID
	 * 		does not already exist, or {@code null} if an entity with this ID already exists.
	 */
	public final T acquireEntity(K id) {
		// Return null if an entity with this ID has been instantiated and is pending persistence.
		if (!pendingIds.add(id)) {
			return null;
		}

		// Return null if an entity with this ID already exists in the database.
		try (Session session = HighscoresService.getHibernateSessionFactory().openSession()) {
			if (session.get(clazz, id) != null) {
				return null;
			}
		}

		return instantiateEntity(id);
	}

	/**
	 * Removes an entity from the list of pending entities. This method should be called after an entity created by
	 * {@link #acquireEntity(Serializable)} has been persisted.
	 * <p>
	 * This method must be called for all entities created by {@link #acquireEntity(Serializable)} (not including any
	 * {@code null} entities) to prevent memory "leaks".
	 *
	 * @param id The ID of the entity to remove from the list of pending entities.
	 */
	public final void persistEntity(K id) {
		pendingIds.remove(id);
	}

	/**
	 * Removes entities from the list of pending entities. This method should be called after entities created by {@link
	 * #acquireEntity(Serializable)} have been persisted.
	 * <p>
	 * This method must be called for all entities created by {@link #acquireEntity(Serializable)} (not including any
	 * {@code null} entities) to prevent memory "leaks".
	 *
	 * @param ids The IDs of the entities to remove from the list of pending entities.
	 */
	public final void persistEntities(Collection<K> ids) {
		pendingIds.removeAll(ids);
	}

	/**
	 * Instantiates a new entity with the specified ID. Implementations of this method must set any relevant fields in
	 * the entity to ensure that the ID returned by {@link HibernateEntity#getIdentifier()} is equal to {@code id}.
	 *
	 * @param id The ID to initialize the entity with.
	 * @return A new entity that has been initialized such that {@link HibernateEntity#getIdentifier()} is equal to
	 *        {@code id}.
	 */
	protected abstract T instantiateEntity(K id);
}
