package com.endura.service;

import com.endura.domain.integration.Integration;
import com.endura.domain.integration.IntegrationRepository;
import com.endura.integration.strava.StravaIntegrationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class StravaScheduledSyncService {

    private static final Logger logger = LoggerFactory.getLogger(StravaScheduledSyncService.class);

    @Autowired
    private IntegrationRepository integrationRepository;

    @Autowired
    private StravaIntegrationService stravaIntegrationService;

    // Executa a cada 2 horas
    @Scheduled(fixedRate = 7200000)
    public void syncAllUserActivities() {
        logger.info("Starting scheduled Strava sync for all users");
        
        List<Integration> stravaIntegrations = integrationRepository.findByPlatformAndIsActive(Integration.Platform.STRAVA, true);
        
        int totalSynced = 0;
        int errors = 0;
        
        for (Integration integration : stravaIntegrations) {
            try {
                // Only sync if last update was more than 1 hour ago
                if (integration.getUpdatedAt().isBefore(LocalDateTime.now().minusHours(1))) {
                    int syncedCount = stravaIntegrationService.syncUserActivities(integration.getUser().getId());
                    totalSynced += syncedCount;
                    logger.info("Synced {} activities for user: {}", syncedCount, integration.getUser().getId());
                }
            } catch (Exception e) {
                errors++;
                logger.error("Failed to sync activities for user {}: {}", integration.getUser().getId(), e.getMessage());
            }
        }
        
        logger.info("Scheduled sync completed. Total synced: {}, Errors: {}", totalSynced, errors);
    }

    // Executa diariamente às 6:00 AM
    @Scheduled(cron = "0 0 6 * * *")
    public void dailyTokenRefresh() {
        logger.info("Starting daily token refresh");
        
        List<Integration> stravaIntegrations = integrationRepository.findByPlatformAndIsActive(Integration.Platform.STRAVA, true);
        
        for (Integration integration : stravaIntegrations) {
            try {
                // Refresh tokens that expire within 24 hours
                if (integration.getExpiresAt().isBefore(LocalDateTime.now().plusHours(24))) {
                    stravaIntegrationService.refreshToken(integration.getUser().getId());
                    logger.info("Token refreshed for user: {}", integration.getUser().getId());
                }
            } catch (Exception e) {
                logger.error("Failed to refresh token for user {}: {}", integration.getUser().getId(), e.getMessage());
            }
        }
        
        logger.info("Daily token refresh completed");
    }
}