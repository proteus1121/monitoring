package org.proteus1121.config;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Writes the OpenAPI spec of this code to the file in the openapi.out property, to generate the frontend client
 * from it without a running stack: ./gradlew test --tests OpenApiSpecTest -Dopenapi.out=build/openapi.json
 * (npm run api-typegen:local in src/frontend does both). The database is an in-memory H2, MQTT is not reachable.
 */
@EnabledIfSystemProperty(named = "openapi.out", matches = ".+")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "spring.datasource.url=jdbc:h2:mem:openapi;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create",
        "spring.session.jdbc.initialize-schema=always",
        "mqtt.broker.url=tcp://localhost:1",
        "logging.level.root=WARN",
})
class OpenApiSpecTest {

    @Autowired
    private TestRestTemplate rest;

    @Test
    void writeSpec() throws Exception {
        String spec = rest.getForObject("/v3/api-docs", String.class);
        assertTrue(spec != null && spec.contains("\"paths\""), "no OpenAPI spec: " + spec);
        Path out = Path.of(System.getProperty("openapi.out"));
        if (out.getParent() != null) {
            Files.createDirectories(out.getParent());
        }
        Files.writeString(out, spec);
    }
}
