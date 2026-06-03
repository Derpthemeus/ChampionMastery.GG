FROM gradle:jdk8 AS build
WORKDIR /home/gradle
COPY ["build.gradle", "settings.gradle", "./"]
COPY ["src", "src/"]
RUN ["gradle", "shadowJar", "--no-daemon", "--console=plain"]

# FIXME we should problably update from JDK8 (:
FROM amazoncorretto:8 AS run
ENTRYPOINT ["java", "-jar", "shadowed.jar"]
COPY --from=build ["/home/gradle/build/libs/highscores-service-all.jar", "shadowed.jar"]
