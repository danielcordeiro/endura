package com.endura.common.dto;

public class AuthResponse {
    private String token;
    private String refreshToken;
    private String type = "Bearer";
    private Long userId;
    private String email;
    private String name;
    private boolean stravaConnected;
    
    public AuthResponse() {}
    
    public AuthResponse(String token, String refreshToken, Long userId, String email, String name, boolean stravaConnected) {
        this.token = token;
        this.refreshToken = refreshToken;
        this.userId = userId;
        this.email = email;
        this.name = name;
        this.stravaConnected = stravaConnected;
    }
    
    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
    
    public String getRefreshToken() { return refreshToken; }
    public void setRefreshToken(String refreshToken) { this.refreshToken = refreshToken; }
    
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    
    public boolean isStravaConnected() { return stravaConnected; }
    public void setStravaConnected(boolean stravaConnected) { this.stravaConnected = stravaConnected; }
}