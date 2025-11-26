import org.gradle.api.tasks.Exec
import org.gradle.api.tasks.Copy

plugins {
    java
    id("org.springframework.boot") version ("3.2.2")
    id("io.spring.dependency-management") version ("1.1.4")
    id("io.freefair.lombok") version "6.6.3"
}

group = "org.proteus1121"
version = "1.0.0"
java.sourceCompatibility = JavaVersion.VERSION_17

repositories {
    mavenCentral()
}

dependencies {
    // Web
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.springframework.boot:spring-boot-starter")
    
    // Swagger
    implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:2.3.0")

    // Session JDBC
    implementation("org.springframework.session:spring-session-jdbc")
    implementation("org.hibernate.orm:hibernate-core:6.4.1.Final")

    // Jakarta Validation
    implementation("jakarta.validation:jakarta.validation-api:3.1.0")

    // Mapstruct
    implementation("org.mapstruct:mapstruct:1.5.5.Final")
    annotationProcessor("org.mapstruct:mapstruct-processor:1.5.5.Final")

    // Apache Commons
    implementation("org.apache.commons:commons-lang3:3.17.0")

    // ND4J
    implementation("org.nd4j:nd4j-native-platform:1.0.0-M2.1")
    implementation("org.deeplearning4j:deeplearning4j-core:1.0.0-M2.1")

    // Mosquitto
    implementation("org.springframework.integration:spring-integration-mqtt")
    implementation("org.springframework.boot:spring-boot-starter-integration")
    implementation("com.fasterxml.jackson.core:jackson-databind")

    // Open Feign client
    implementation("org.springframework.cloud:spring-cloud-starter-openfeign:4.1.0")

    // Lombok dependency
    compileOnly("org.projectlombok:lombok:1.18.30")
    annotationProcessor("org.projectlombok:lombok:1.18.30")

    // Database
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("mysql:mysql-connector-java:8.0.33")

    // Security
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.security:spring-security-core")
    implementation("org.springframework.security:spring-security-config")

    // Tests
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation(platform("org.junit:junit-bom:5.10.0"))
    testImplementation("org.junit.jupiter:junit-jupiter")
}

tasks.test {
    useJUnitPlatform()
}
