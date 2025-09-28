package com.endura.integration.strava;

import com.fasterxml.jackson.annotation.JsonProperty;

public class StravaTokenResponse {
    
    @JsonProperty("access_token")
    private String accessToken;
    
    @JsonProperty("refresh_token")
    private String refreshToken;
    
    @JsonProperty("expires_at")
    private Long expiresAt;
    
    @JsonProperty("token_type")
    private String tokenType;
    
    private StravaAthlete athlete;
    
    // Constructors
    public StravaTokenResponse() {}
    
    // Getters and Setters
    public String getAccessToken() { return accessToken; }
    public void setAccessToken(String accessToken) { this.accessToken = accessToken; }
    
    public String getRefreshToken() { return refreshToken; }
    public void setRefreshToken(String refreshToken) { this.refreshToken = refreshToken; }
    
    public Long getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Long expiresAt) { this.expiresAt = expiresAt; }
    
    public String getTokenType() { return tokenType; }
    public void setTokenType(String tokenType) { this.tokenType = tokenType; }
    
    public StravaAthlete getAthlete() { return athlete; }
    public void setAthlete(StravaAthlete athlete) { this.athlete = athlete; }
}