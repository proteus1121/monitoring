package org.proteus1121;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;

@EnableWebMvc
@SpringBootApplication
@EnableConfigurationProperties
public class Application {

    public static void main(final String[] args) {
        SpringApplication.run(Application.class, args);
    }

}
