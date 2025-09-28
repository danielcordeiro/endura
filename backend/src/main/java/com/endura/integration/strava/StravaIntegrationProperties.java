package com.endura.integration.strava;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.util.Assert;

@ConfigurationProperties(prefix = "integrations.strava")
public class StravaIntegrationProperties {

    private String clientId;
    private String clientSecret;
    private String redirectUri;
    private String baseUrl = "https://www.strava.com/api/v3";
    private String authUrl = "https://www.strava.com/oauth";

    public String getClientId() {
        return clientId;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId;
    }

    public String getClientSecret() {
        return clientSecret;
    }

    public void setClientSecret(String clientSecret) {
        this.clientSecret = clientSecret;
    }

    public String getRedirectUri() {
        return redirectUri;
    }

    public void setRedirectUri(String redirectUri) {
        this.redirectUri = redirectUri;
    }

    public String getBaseUrl() {
        return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    public String getAuthUrl() {
        return authUrl;
    }

    public void setAuthUrl(String authUrl) {
        this.authUrl = authUrl;
    }

    public void validate() {
        Assert.hasText(clientId, "Strava client id must be configured");
        Assert.hasText(clientSecret, "Strava client secret must be configured");
        Assert.hasText(redirectUri, "Strava redirect uri must be configured");
    }
}
