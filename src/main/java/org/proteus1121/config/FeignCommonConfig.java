package org.proteus1121.config;

import feign.Logger;
import feign.Retryer;
import feign.codec.ErrorDecoder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class FeignCommonConfig {

    private final long period;
    private final long maxPeriod;
    private final int maxAttempts;
    
    public FeignCommonConfig(@Value("${http.retry.period}") long period,
                                @Value("${http.retry.max-period}") long maxPeriod,
                                @Value("${http.retry.attempts}") int maxAttempts) {
        this.period = period;
        this.maxPeriod = maxPeriod;
        this.maxAttempts = maxAttempts;
    }
    
    @Bean
    Logger.Level feignLoggerLevel() {
        return Logger.Level.BASIC;
    }

    @Bean
    public ErrorDecoder telegramErrorDecoder() {
        return (methodKey, response) -> {
            String msg = String.format("Telegram API error: %s %s", response.status(), response.reason());
            return new RuntimeException(msg);
        };
    }

    @Bean
    public Retryer retryer() {
        return new Retryer.Default(period, maxPeriod, maxAttempts);
    }
}