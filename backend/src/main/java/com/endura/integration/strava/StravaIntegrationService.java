package com.endura.integration.strava;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import com.endura.domain.integration.IntegrationRepository;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class StravaIntegrationService {
    
    private static final Logger logger = LoggerFactory.getLogger(StravaIntegrationService.class);
    
    private final WebClient webClient;
    private final String clientId;
    private final String clientSecret;
    private final String baseUrl;
    private final String authUrl;
    private final IntegrationRepository integrationRepository;
    
    public StravaIntegrationService(
            @Value("${integrations.strava.client-id}") String clientId,
            @Value("${integrations.strava.client-secret}") String clientSecret,
            @Value("${integrations.strava.base-url}") String baseUrl,
            @Value("${integrations.strava.auth-url}") String authUrl,
            WebClient.Builder webClientBuilder,
            IntegrationRepository integrationRepository) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.baseUrl = baseUrl;
        this.authUrl = authUrl;
        this.integrationRepository = integrationRepository;
        this.webClient = webClientBuilder
                .baseUrl(baseUrl)
                .build();
    }
    
    /**
     * Exchange authorization code for access token
     */
    public Mono<StravaTokenResponse> exchangeCodeForToken(String code) {
        logger.info("Exchanging authorization code for access token");
        
        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("client_id", clientId);
        body.add("client_secret", clientSecret);
        body.add("code", code);
        body.add("grant_type", "authorization_code");
        
        return webClient.post()
                .uri(authUrl + "/token")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(BodyInserters.fromFormData(body))
                .retrieve()
                .bodyToMono(StravaTokenResponse.class)
                .timeout(Duration.ofSeconds(10))
                .doOnSuccess(response -> logger.info("Successfully exchanged code for token"))
                .doOnError(error -> logger.error("Failed to exchange code for token", error));
    }
    
    /**
     * Refresh access token using refresh token
     */
    public Mono<StravaTokenResponse> refreshToken(String refreshToken) {
        logger.info("Refreshing access token");
        
        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("client_id", clientId);
        body.add("client_secret", clientSecret);
        body.add("refresh_token", refreshToken);
        body.add("grant_type", "refresh_token");
        
        return webClient.post()
                .uri(authUrl + "/token")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(BodyInserters.fromFormData(body))
                .retrieve()
                .bodyToMono(StravaTokenResponse.class)
                .timeout(Duration.ofSeconds(10))
                .doOnSuccess(response -> logger.info("Successfully refreshed token"))
                .doOnError(error -> logger.error("Failed to refresh token", error));
    }
    
    /**
     * Fetch activities from Strava
     */
    public Flux<StravaActivity> fetchActivities(String accessToken, LocalDateTime after, int perPage) {
        logger.info("Fetching activities from Strava after: {}", after);
        
        String afterTimestamp = after != null ? 
                String.valueOf(after.toEpochSecond(java.time.ZoneOffset.UTC)) : null;
        
        return webClient.get()
                .uri(uriBuilder -> {
                    var builder = uriBuilder.path("/athlete/activities")
                            .queryParam("per_page", Math.min(perPage, 200)); // Strava max is 200
                    if (afterTimestamp != null) {
                        builder.queryParam("after", afterTimestamp);
                    }
                    return builder.build();
                })
                .headers(h -> h.setBearerAuth(accessToken))
                .retrieve()
                .bodyToFlux(StravaActivity.class)
                .timeout(Duration.ofSeconds(30))
                .doOnNext(activity -> logger.debug("Fetched activity: {} - {}", activity.getId(), activity.getName()))
                .doOnError(error -> logger.error("Failed to fetch activities", error));
    }
    
    /**
     * Fetch activities from the last 30 days
     */
    public Flux<StravaActivity> fetchRecentActivities(String accessToken) {
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
        return fetchActivities(accessToken, thirtyDaysAgo, 50);
    }
    
    /**
     * Get detailed activity information
     */
    public Mono<StravaActivity> getActivity(String accessToken, Long activityId) {
        logger.info("Fetching activity details for ID: {}", activityId);
        
        return webClient.get()
                .uri("/activities/{id}", activityId)
                .headers(h -> h.setBearerAuth(accessToken))
                .retrieve()
                .bodyToMono(StravaActivity.class)
                .timeout(Duration.ofSeconds(10))
                .doOnSuccess(activity -> logger.info("Successfully fetched activity: {}", activity.getName()))
                .doOnError(error -> logger.error("Failed to fetch activity details for ID: {}", activityId, error));
    }
    
    /**
     * Get current athlete information
     */
    public Mono<StravaAthlete> getCurrentAthlete(String accessToken) {
        logger.info("Fetching current athlete information");
        
        return webClient.get()
                .uri("/athlete")
                .headers(h -> h.setBearerAuth(accessToken))
                .retrieve()
                .bodyToMono(StravaAthlete.class)
                .timeout(Duration.ofSeconds(10))
                .doOnSuccess(athlete -> logger.info("Successfully fetched athlete: {} {}", 
                        athlete.getFirstname(), athlete.getLastname()))
                .doOnError(error -> logger.error("Failed to fetch athlete information", error));
    }
    
    /**
     * Build authorization URL for OAuth flow
     */
    public String buildAuthorizationUrl(String redirectUri, String state) {
        return String.format("%s/authorize?client_id=%s&response_type=code&redirect_uri=%s&approval_prompt=force&scope=read,activity:read_all&state=%s",
                authUrl, clientId, redirectUri, state);
    }
    
    /**
     * Check if token is expired or about to expire
     */
    public boolean isTokenExpired(Long expiresAt) {
        if (expiresAt == null) return true;
        
        long currentTime = System.currentTimeMillis() / 1000;
        long bufferTime = 300; // 5 minutes buffer
        
        return currentTime >= (expiresAt - bufferTime);
    }
    
    /**
     * Save Strava integration for user
     */
    public void saveIntegration(com.endura.domain.user.User user, StravaTokenResponse tokenResponse) {
        try {
            // Verificar se já existe uma integração Strava para este usuário
            var existingIntegration = integrationRepository.findByUserIdAndPlatform(
                user.getId(), 
                com.endura.domain.integration.Integration.Platform.STRAVA
            );
            
            com.endura.domain.integration.Integration integration;
            
            if (existingIntegration.isPresent()) {
                // Atualizar integração existente
                integration = existingIntegration.get();
                integration.setAccessToken(tokenResponse.getAccessToken());
                integration.setRefreshToken(tokenResponse.getRefreshToken());
                integration.setExternalUserId(tokenResponse.getAthlete().getId().toString());
            } else {
                // Criar nova integração
                integration = new com.endura.domain.integration.Integration();
                integration.setUser(user);
                integration.setPlatform(com.endura.domain.integration.Integration.Platform.STRAVA);
                integration.setAccessToken(tokenResponse.getAccessToken());
                integration.setRefreshToken(tokenResponse.getRefreshToken());
                integration.setExternalUserId(tokenResponse.getAthlete().getId().toString());
            }
            
            // Calcular data de expiração (Strava tokens expiram em 6 horas)
            if (tokenResponse.getExpiresIn() != null) {
                integration.setExpiresAt(LocalDateTime.now().plusSeconds(tokenResponse.getExpiresIn()));
            }
            
            integration.setIsActive(true);
            integrationRepository.save(integration);
            
            logger.info("Integração Strava salva com sucesso para usuário {}", user.getId());
            
        } catch (Exception e) {
            logger.error("Erro ao salvar integração Strava para usuário {}: {}", user.getId(), e.getMessage());
            throw new RuntimeException("Erro ao salvar integração Strava", e);
        }
    }
    
    /**
     * Check if user is connected to Strava
     */
    public boolean isUserConnectedToStrava(Long userId) {
        try {
            var integration = integrationRepository.findByUserIdAndPlatform(
                userId, 
                com.endura.domain.integration.Integration.Platform.STRAVA
            );
            
            return integration.isPresent() && integration.get().getIsActive() && !integration.get().isTokenExpired();
        } catch (Exception e) {
            logger.error("Erro ao verificar conexão Strava para usuário {}: {}", userId, e.getMessage());
            return false;
        }
    }
    
    /**
     * Disconnect user from Strava
     */
    public void disconnectUser(Long userId) {
        try {
            var integration = integrationRepository.findByUserIdAndPlatform(
                userId, 
                com.endura.domain.integration.Integration.Platform.STRAVA
            );
            
            if (integration.isPresent()) {
                integration.get().setIsActive(false);
                integrationRepository.save(integration.get());
                logger.info("Usuário {} desconectado do Strava com sucesso", userId);
            } else {
                logger.warn("Nenhuma integração Strava encontrada para usuário {}", userId);
            }
        } catch (Exception e) {
            logger.error("Erro ao desconectar usuário {} do Strava: {}", userId, e.getMessage());
            throw new RuntimeException("Erro ao desconectar do Strava", e);
        }
    }
}