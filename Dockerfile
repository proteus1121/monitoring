FROM eclipse-temurin:17-jdk

ARG PROFILE

COPY build/libs/monitoring-1.0.0.jar monitoring.jar

ENTRYPOINT ["java","-Dspring.profiles.active=${PROFILE}","-jar","/monitoring.jar"]
