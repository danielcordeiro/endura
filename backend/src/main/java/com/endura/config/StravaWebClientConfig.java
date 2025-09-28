package com.endura.config;

import com.endura.integration.strava.StravaIntegrationProperties;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.web.reactive.function.client.ExchangeStrategies;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
@EnableConfigurationProperties(StravaIntegrationProperties.class)
public class StravaWebClientConfig {

    @Bean
    @Qualifier("stravaApiWebClient")
    public WebClient stravaApiWebClient(WebClient.Builder builder, StravaIntegrationProperties properties) {
        return builder
            .baseUrl(properties.getBaseUrl())
            .defaultHeader("Accept", MediaType.APPLICATION_JSON_VALUE)
            .exchangeStrategies(ExchangeStrategies.builder()
                .codecs(codecs -> codecs.defaultCodecs().maxInMemorySize(2 * 1024 * 1024))
                .build())
            .build();
    }

    @Bean
    @Qualifier("stravaAuthWebClient")
    public WebClient stravaAuthWebClient(WebClient.Builder builder, StravaIntegrationProperties properties) {
        return builder
            .baseUrl(properties.getAuthUrl())
            .defaultHeader("Accept", MediaType.APPLICATION_JSON_VALUE)
            .exchangeStrategies(ExchangeStrategies.builder()
                .codecs(codecs -> codecs.defaultCodecs().maxInMemorySize(256 * 1024))
                .build())
            .build();
    }
}
