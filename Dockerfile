FROM eclipse-temurin:17-jdk

ARG PROFILE

# Install system dependencies for XGBoost and C++ runtime
RUN apt-get update && \
    apt-get install -y software-properties-common && \
    add-apt-repository ppa:ubuntu-toolchain-r/test && \
    apt-get update && \
    apt-get install -y libstdc++6 libomp-dev && \
    apt-get upgrade -y && \
    apt-get dist-upgrade -y && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

COPY build/libs/monitoring-1.0.0.jar monitoring.jar

ENTRYPOINT ["java","-Dspring.profiles.active=${PROFILE}","-jar","/monitoring.jar"]
