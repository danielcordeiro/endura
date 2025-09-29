package com.endura.integration.strava;

import com.endura.domain.integration.Integration;
import com.endura.domain.integration.IntegrationRepository;
import com.endura.domain.workout.Workout;
import com.endura.domain.workout.WorkoutRepository;
import com.endura.domain.user.User;
import com.endura.domain.user.UserRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class StravaIntegrationService {

    private static final Logger logger = LoggerFactory.getLogger(StravaIntegrationService.class);

    @Autowired
    private IntegrationRepository integrationRepository;

    @Autowired
    private WorkoutRepository workoutRepository;

    @Autowired
    private UserRepository userRepository;

    @Value("${strava.client.id}")
    private String clientId;

    @Value("${strava.client.secret}")
    private String clientSecret;

    @Value("${strava.redirect.uri}")
    private String redirectUri;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();
    
    public StravaTokenResponse exchangeCodeForToken(String code) {
        String url = "https://www.strava.com/oauth/token";
        
        Map<String, String> requestBody = new HashMap<>();
        requestBody.put("client_id", clientId);
        requestBody.put("client_secret", clientSecret);
        requestBody.put("code", code);
        requestBody.put("grant_type", "authorization_code");
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        
        HttpEntity<Map<String, String>> request = new HttpEntity<>(requestBody, headers);
        
        try {
            ResponseEntity<StravaTokenResponse> response = restTemplate.postForEntity(url, request, StravaTokenResponse.class);
            return response.getBody();
        } catch (Exception e) {
            logger.error("Error exchanging code for token: {}", e.getMessage());
            throw new RuntimeException("Failed to exchange code for token", e);
        }
    }

    public void saveIntegration(Long userId, StravaTokenResponse tokenResponse) {
        Optional<Integration> existingIntegration = integrationRepository.findByUserIdAndPlatform(userId, Integration.Platform.STRAVA);
        Optional<User> userOptional = userRepository.findById(userId);
        
        if (userOptional.isEmpty()) {
            throw new RuntimeException("User not found");
        }
        
        User user = userOptional.get();
        Integration integration = existingIntegration.orElse(new Integration());
        integration.setUser(user);
        integration.setPlatform(Integration.Platform.STRAVA);
        integration.setExternalUserId(tokenResponse.getAthlete().getId().toString());
        integration.setAccessToken(tokenResponse.getAccessToken());
        integration.setRefreshToken(tokenResponse.getRefreshToken());
        integration.setExpiresAt(LocalDateTime.now().plusSeconds(tokenResponse.getExpiresIn()));
        integration.setIsActive(true);
        
        integrationRepository.save(integration);
        logger.info("Strava integration saved for user: {}", userId);
    }

    public boolean isUserConnectedToStrava(Long userId) {
        return integrationRepository.findByUserIdAndPlatform(userId, Integration.Platform.STRAVA)
                .map(Integration::getIsActive)
                .orElse(false);
    }

    public List<StravaActivity> fetchActivities(Long userId) {
        Optional<Integration> integration = integrationRepository.findByUserIdAndPlatform(userId, Integration.Platform.STRAVA);
        
        if (integration.isEmpty() || !integration.get().getIsActive()) {
            throw new RuntimeException("User not connected to Strava");
        }

        Integration stravaIntegration = integration.get();
        
        // Check if token needs refresh
        if (stravaIntegration.getExpiresAt().isBefore(LocalDateTime.now())) {
            refreshToken(userId);
            stravaIntegration = integrationRepository.findByUserIdAndPlatform(userId, Integration.Platform.STRAVA).orElseThrow();
        }

        String url = "https://www.strava.com/api/v3/athlete/activities?per_page=50";
        
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(stravaIntegration.getAccessToken());
        
        HttpEntity<String> entity = new HttpEntity<>(headers);
        
        try {
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            return objectMapper.readValue(response.getBody(), new TypeReference<List<StravaActivity>>() {});
        } catch (Exception e) {
            logger.error("Error fetching activities from Strava: {}", e.getMessage());
            throw new RuntimeException("Failed to fetch activities from Strava", e);
        }
    }

    public int syncUserActivities(Long userId) {
        try {
            List<StravaActivity> activities = fetchActivities(userId);
            Optional<User> userOptional = userRepository.findById(userId);
            
            if (userOptional.isEmpty()) {
                throw new RuntimeException("User not found");
            }

            User user = userOptional.get();
            int syncedCount = 0;

            for (StravaActivity activity : activities) {
                if (!workoutRepository.existsByStravaActivityId(activity.getId())) {
                    Workout workout = mapStravaActivityToWorkout(activity, user);
                    workoutRepository.save(workout);
                    syncedCount++;
                    logger.info("Synced activity: {} for user: {}", activity.getName(), userId);
                }
            }

            logger.info("Synced {} new activities for user: {}", syncedCount, userId);
            return syncedCount;

        } catch (Exception e) {
            logger.error("Error syncing activities for user {}: {}", userId, e.getMessage());
            throw new RuntimeException("Failed to sync activities", e);
        }
    }

    private Workout mapStravaActivityToWorkout(StravaActivity activity, User user) {
        Workout workout = new Workout();
        workout.setUser(user);
        workout.setTitle(activity.getName());
        workout.setStravaActivityId(activity.getId());
        workout.setActivityType(activity.getType());
        
        // Parse start date
        if (activity.getStartDate() != null) {
            try {
                ZonedDateTime zonedDateTime = ZonedDateTime.parse(activity.getStartDate(), DateTimeFormatter.ISO_ZONED_DATE_TIME);
                workout.setStartDate(zonedDateTime.toLocalDateTime());
            } catch (Exception e) {
                logger.warn("Failed to parse start date: {}", activity.getStartDate());
                workout.setStartDate(LocalDateTime.now());
            }
        }
        
        workout.setDistanceMeters(activity.getDistance() != null ? BigDecimal.valueOf(activity.getDistance()) : BigDecimal.ZERO);
        workout.setMovingTimeSeconds(activity.getMovingTime());
        workout.setElapsedTimeSeconds(activity.getElapsedTime());
        workout.setElevationGainMeters(activity.getTotalElevationGain() != null ? BigDecimal.valueOf(activity.getTotalElevationGain()) : BigDecimal.ZERO);
        workout.setAverageSpeed(activity.getAverageSpeed() != null ? BigDecimal.valueOf(activity.getAverageSpeed()) : BigDecimal.ZERO);
        workout.setMaxSpeed(activity.getMaxSpeed() != null ? BigDecimal.valueOf(activity.getMaxSpeed()) : BigDecimal.ZERO);
        workout.setAverageHeartrate(activity.getAverageHeartrate() != null ? activity.getAverageHeartrate().intValue() : null);
        workout.setMaxHeartrate(activity.getMaxHeartrate() != null ? activity.getMaxHeartrate().intValue() : null);
        workout.setSyncSource("STRAVA");
        
        return workout;
    }

    public void refreshToken(Long userId) {
        Optional<Integration> integration = integrationRepository.findByUserIdAndPlatform(userId, Integration.Platform.STRAVA);
        
        if (integration.isEmpty()) {
            throw new RuntimeException("No Strava integration found for user");
        }

        Integration stravaIntegration = integration.get();
        String url = "https://www.strava.com/oauth/token";
        
        Map<String, String> requestBody = new HashMap<>();
        requestBody.put("client_id", clientId);
        requestBody.put("client_secret", clientSecret);
        requestBody.put("refresh_token", stravaIntegration.getRefreshToken());
        requestBody.put("grant_type", "refresh_token");
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        
        HttpEntity<Map<String, String>> request = new HttpEntity<>(requestBody, headers);
        
        try {
            ResponseEntity<StravaTokenResponse> response = restTemplate.postForEntity(url, request, StravaTokenResponse.class);
            StravaTokenResponse tokenResponse = response.getBody();
            
            if (tokenResponse != null) {
                stravaIntegration.setAccessToken(tokenResponse.getAccessToken());
                stravaIntegration.setRefreshToken(tokenResponse.getRefreshToken());
                stravaIntegration.setExpiresAt(LocalDateTime.now().plusSeconds(tokenResponse.getExpiresIn()));
                
                integrationRepository.save(stravaIntegration);
                logger.info("Token refreshed for user: {}", userId);
            }
        } catch (Exception e) {
            logger.error("Error refreshing token for user {}: {}", userId, e.getMessage());
            throw new RuntimeException("Failed to refresh token", e);
        }
    }

    public Map<String, Object> getSyncStatus(Long userId) {
        Map<String, Object> status = new HashMap<>();
        
        Optional<Integration> integration = integrationRepository.findByUserIdAndPlatform(userId, Integration.Platform.STRAVA);
        
        if (integration.isEmpty()) {
            status.put("connected", false);
            status.put("syncedWorkouts", 0);
            return status;
        }

        Integration stravaIntegration = integration.get();
        Long syncedWorkouts = workoutRepository.countStravaWorkoutsByUserId(userId);
        
        status.put("connected", stravaIntegration.getIsActive());
        status.put("syncedWorkouts", syncedWorkouts);
        status.put("lastSync", stravaIntegration.getUpdatedAt());
        status.put("tokenExpires", stravaIntegration.getExpiresAt());
        
        return status;
    }

    public void disconnectStrava(Long userId) {
        Optional<Integration> integration = integrationRepository.findByUserIdAndPlatform(userId, Integration.Platform.STRAVA);
        
        if (integration.isPresent()) {
            Integration stravaIntegration = integration.get();
            stravaIntegration.setIsActive(false);
            integrationRepository.save(stravaIntegration);
            logger.info("Strava disconnected for user: {}", userId);
        }
    }
}