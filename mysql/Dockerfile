# TODO investigate why builds break in 8.0.27
FROM mysql:8.0.26

ARG MYSQL_ROOT_PASSWORD

ENTRYPOINT ["mysqld", "--user=root", "--datadir=/mysql_data", "--disable-log-bin"]

RUN echo "Initializing database..." && \
	password=$(mysqld --initialize --user=root --datadir=/mysql_data 2>&1 \
		| grep "A temporary password is generated for" | tail -1 | sed -n 's/.*root@localhost: //p') && \
	echo "Database initialized" && \
	(mysqld --user=root --datadir=/mysql_data --disable-log-bin & mysql_pid=$!) && \
	echo -n "Waiting for database to start" && \
	until mysqladmin ping -s; do\
		echo -n "."; \
		sleep 1; \
	done; \
	printf "\nDatabase started\n" && \
	mysql --user=root --password="$password" --connect-expired-password -e \
		"SET GLOBAL default_password_lifetime = 0; \
		ALTER USER 'root'@'localhost' IDENTIFIED BY '$MYSQL_ROOT_PASSWORD'; \
		CREATE USER 'root'@'%' IDENTIFIED BY '$MYSQL_ROOT_PASSWORD'; \
		GRANT ALL ON *.* TO 'root'@'%';" && \
	echo "Shutting down database..." && \
	mysqladmin --user=root --password="$MYSQL_ROOT_PASSWORD" shutdown && \
	wait $mysql_pid

COPY /schema.sql /schema.sql
RUN (mysqld --user=root --datadir=/mysql_data --disable-log-bin & mysql_pid=$!) && \
	echo -n "Waiting for database to start" && \
	until mysqladmin ping -s; do \
		echo -n "."; \
		sleep 1; \
	done; \
	printf "\nDatabase started\n" && \
	mysql --user=root --password="$MYSQL_ROOT_PASSWORD" < /schema.sql && \
	echo "Shutting down database..." && \
	mysqladmin --user=root --password="$MYSQL_ROOT_PASSWORD" shutdown && \
	wait $mysql_pid

VOLUME /mysql_data
