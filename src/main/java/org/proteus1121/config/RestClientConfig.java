package org.proteus1121.config;

import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

/**
 * Configuration for REST client beans used throughout the application.
 */
@Configuration
public class RestClientConfig {

    /**
     * Create a RestTemplate bean for making HTTP requests.
     * Configured with reasonable timeouts for service-to-service communication.
     */
    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplateBuilder()
            .setReadTimeout(Duration.ofSeconds(5))
            .setConnectTimeout(Duration.ofSeconds(5))
            .build();
    }
}

