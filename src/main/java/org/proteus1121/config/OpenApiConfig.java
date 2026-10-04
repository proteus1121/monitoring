package org.proteus1121.config;

import io.swagger.v3.core.jackson.ModelResolver;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    static {
        // enums as named schemas, so the generated frontend client (npm run api-typegen) gets a type per enum
        ModelResolver.enumsAsRef = true;
    }

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Monitoring project API")
                        .version("1.0.0")
                        .description("API documentation for monitoring system"));
    }
}
