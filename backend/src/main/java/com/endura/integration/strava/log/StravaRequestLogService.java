package com.endura.integration.strava.log;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StravaRequestLogService {

    private static final String DEFAULT_ENDPOINT = "/api/auth/strava/callback";
    private static final String DEFAULT_METHOD = "POST";

    private final StravaRequestLogRepository repository;

    public StravaRequestLogService(StravaRequestLogRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public void logSuccess(Long userId, String authorizationCode, String message) {
        StravaRequestLog log = new StravaRequestLog();
        log.setUserId(userId);
        log.setEndpoint(DEFAULT_ENDPOINT);
        log.setHttpMethod(DEFAULT_METHOD);
        log.setOutcome(StravaRequestOutcome.SUCCESS);
        log.setHttpStatus(200);
        log.setAuthorizationCode(maskAuthorizationCode(authorizationCode));
        log.setMessage(message);
        repository.save(log);
    }

    @Transactional
    public void logFailure(Long userId, String authorizationCode, String message, String errorDetails, Integer httpStatus) {
        StravaRequestLog log = new StravaRequestLog();
        log.setUserId(userId);
        log.setEndpoint(DEFAULT_ENDPOINT);
        log.setHttpMethod(DEFAULT_METHOD);
        log.setOutcome(StravaRequestOutcome.FAILURE);
        log.setHttpStatus(httpStatus);
        log.setAuthorizationCode(maskAuthorizationCode(authorizationCode));
        log.setMessage(message);
        log.setErrorDetails(errorDetails);
        repository.save(log);
    }

    private String maskAuthorizationCode(String authorizationCode) {
        if (authorizationCode == null || authorizationCode.isBlank()) {
            return authorizationCode;
        }
        int visibleChars = Math.min(4, authorizationCode.length());
        return authorizationCode.substring(0, visibleChars) + "***";
    }
}
