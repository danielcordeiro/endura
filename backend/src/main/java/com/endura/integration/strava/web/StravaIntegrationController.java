package com.endura.integration.strava.web;

import com.endura.integration.strava.StravaIntegrationService;
import com.endura.integration.strava.dto.StravaActivity;
import com.endura.integration.strava.dto.StravaAthlete;
import com.endura.integration.strava.dto.StravaTokenResponse;
import jakarta.validation.Valid;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.Collection;
import java.util.List;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/integrations/strava")
public class StravaIntegrationController {

    private final StravaIntegrationService stravaIntegrationService;

    public StravaIntegrationController(StravaIntegrationService stravaIntegrationService) {
        this.stravaIntegrationService = stravaIntegrationService;
    }

    @GetMapping("/authorize")
    public AuthorizeUrlResponse getAuthorizationUrl(
        @RequestParam(value = "state", required = false) String state,
        @RequestParam(value = "scope", required = false) Collection<String> scope
    ) {
        String authorizationUrl = stravaIntegrationService.buildAuthorizationUrl(state, scope);
        return new AuthorizeUrlResponse(authorizationUrl);
    }

    @PostMapping("/token")
    public StravaTokenResponse exchangeAuthorizationCode(@Valid @RequestBody AuthorizationCodeRequest request) {
        return stravaIntegrationService.exchangeAuthorizationCode(request.getCode());
    }

    @PostMapping("/refresh")
    public StravaTokenResponse refreshAccessToken(@Valid @RequestBody RefreshTokenRequest request) {
        return stravaIntegrationService.refreshToken(request.getRefreshToken());
    }

    @GetMapping("/athlete")
    public StravaAthlete getAthlete(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorizationHeader) {
        String token = extractToken(authorizationHeader);
        return stravaIntegrationService.getAuthenticatedAthlete(token);
    }

    @GetMapping("/activities")
    public List<StravaActivity> getActivities(
        @RequestHeader(HttpHeaders.AUTHORIZATION) String authorizationHeader,
        @RequestParam(value = "after", required = false) String after,
        @RequestParam(value = "before", required = false) String before,
        @RequestParam(value = "page", required = false) Integer page,
        @RequestParam(value = "per_page", required = false) Integer perPage
    ) {
        String token = extractToken(authorizationHeader);
        Instant afterInstant = parseInstant(after);
        Instant beforeInstant = parseInstant(before);
        return stravaIntegrationService.listRecentActivities(token, afterInstant, beforeInstant, page, perPage);
    }

    private static Instant parseInstant(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        try {
            return Instant.parse(value);
        } catch (DateTimeParseException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid date format. Use ISO-8601", ex);
        }
    }

    private static String extractToken(String authorizationHeader) {
        if (!StringUtils.hasText(authorizationHeader)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing Authorization header");
        }

        if (!authorizationHeader.toLowerCase().startsWith("bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authorization header must be a Bearer token");
        }

        String token = authorizationHeader.substring(7).trim();
        if (!StringUtils.hasText(token)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Bearer token is empty");
        }
        return token;
    }
}
