package com.endura.integration.strava.web;

public class AuthorizeUrlResponse {

    private final String url;

    public AuthorizeUrlResponse(String url) {
        this.url = url;
    }

    public String getUrl() {
        return url;
    }
}
