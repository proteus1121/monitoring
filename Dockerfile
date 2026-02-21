FROM eclipse-temurin:17-jdk

ARG PROFILE

# Install system dependencies for XGBoost and C++ runtime
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      libgomp1 \
      libstdc++6 \
 && rm -rf /var/lib/apt/lists/*

COPY build/libs/monitoring-1.0.0.jar monitoring.jar

ENTRYPOINT ["java","-Dspring.profiles.active=${PROFILE}","-jar","/monitoring.jar"]
