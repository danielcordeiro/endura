package com.endura.integration.strava;

import com.endura.integration.strava.dto.StravaActivity;
import com.endura.integration.strava.dto.StravaAthlete;
import com.endura.integration.strava.dto.StravaTokenResponse;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.util.StringUtils;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.util.UriComponentsBuilder;
import reactor.core.publisher.Mono;

@Service
public class StravaIntegrationService {

    private static final String AUTHORIZATION_GRANT_TYPE = "authorization_code";
    private static final String REFRESH_GRANT_TYPE = "refresh_token";

    private final WebClient stravaApiClient;
    private final WebClient stravaAuthClient;
    private final StravaIntegrationProperties properties;

    public StravaIntegrationService(
        @Qualifier("stravaApiWebClient") WebClient stravaApiClient,
        @Qualifier("stravaAuthWebClient") WebClient stravaAuthClient,
        StravaIntegrationProperties properties
    ) {
        this.stravaApiClient = stravaApiClient;
        this.stravaAuthClient = stravaAuthClient;
        this.properties = properties;
    }

    public String buildAuthorizationUrl(String state, Collection<String> scopes) {
        properties.validate();
        String scopeParam = (scopes == null || scopes.isEmpty())
            ? "read,profile:read_all,activity:read_all"
            : scopes.stream()
                .filter(StringUtils::hasText)
                .map(String::trim)
                .collect(Collectors.joining(","));

        UriComponentsBuilder builder = UriComponentsBuilder
            .fromUriString(properties.getAuthUrl() + "/authorize")
            .queryParam("client_id", properties.getClientId())
            .queryParam("redirect_uri", properties.getRedirectUri())
            .queryParam("response_type", "code")
            .queryParam("approval_prompt", "auto")
            .queryParam("scope", scopeParam);

        if (StringUtils.hasText(state)) {
            builder.queryParam("state", state);
        }

        return builder.toUriString();
    }

    public StravaTokenResponse exchangeAuthorizationCode(String code) {
        Objects.requireNonNull(code, "Authorization code is required");
        properties.validate();

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("client_id", properties.getClientId());
        body.add("client_secret", properties.getClientSecret());
        body.add("code", code);
        body.add("grant_type", AUTHORIZATION_GRANT_TYPE);

        return stravaAuthClient.post()
            .uri(uriBuilder -> uriBuilder.path("token").build())
            .contentType(MediaType.APPLICATION_FORM_URLENCODED)
            .body(BodyInserters.fromFormData(body))
            .retrieve()
            .onStatus(HttpStatusCode::isError, this::mapError)
            .bodyToMono(StravaTokenResponse.class)
            .block();
    }

    public StravaTokenResponse refreshToken(String refreshToken) {
        Objects.requireNonNull(refreshToken, "Refresh token is required");
        properties.validate();

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("client_id", properties.getClientId());
        body.add("client_secret", properties.getClientSecret());
        body.add("refresh_token", refreshToken);
        body.add("grant_type", REFRESH_GRANT_TYPE);

        return stravaAuthClient.post()
            .uri(uriBuilder -> uriBuilder.path("token").build())
            .contentType(MediaType.APPLICATION_FORM_URLENCODED)
            .body(BodyInserters.fromFormData(body))
            .retrieve()
            .onStatus(HttpStatusCode::isError, this::mapError)
            .bodyToMono(StravaTokenResponse.class)
            .block();
    }

    public List<StravaActivity> listRecentActivities(String accessToken, Instant after, Instant before, Integer page, Integer perPage) {
        Objects.requireNonNull(accessToken, "Access token is required");

        return stravaApiClient.get()
            .uri(builder -> builder
                .path("athlete/activities")
                .queryParamIfPresent("after", convertToEpoch(after))
                .queryParamIfPresent("before", convertToEpoch(before))
                .queryParamIfPresent("page", toOptional(page))
                .queryParamIfPresent("per_page", toOptional(perPage))
                .build())
            .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
            .retrieve()
            .onStatus(HttpStatusCode::isError, this::mapError)
            .bodyToFlux(StravaActivity.class)
            .collectList()
            .block();
    }

    public StravaAthlete getAuthenticatedAthlete(String accessToken) {
        Objects.requireNonNull(accessToken, "Access token is required");

        return stravaApiClient.get()
            .uri(builder -> builder.path("athlete").build())
            .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
            .retrieve()
            .onStatus(HttpStatusCode::isError, this::mapError)
            .bodyToMono(StravaAthlete.class)
            .block();
    }

    private Mono<? extends Throwable> mapError(ClientResponse response) {
        return response.bodyToMono(String.class)
            .defaultIfEmpty("")
            .flatMap(body -> Mono.error(new StravaApiException(response.statusCode(), body)));
    }

    private static java.util.Optional<Long> convertToEpoch(Instant instant) {
        return instant == null ? java.util.Optional.empty() : java.util.Optional.of(instant.getEpochSecond());
    }

    private static java.util.Optional<Integer> toOptional(Integer value) {
        return value == null ? java.util.Optional.empty() : java.util.Optional.of(value);
    }
}
