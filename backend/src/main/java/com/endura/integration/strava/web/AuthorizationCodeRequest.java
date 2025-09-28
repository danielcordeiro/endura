package com.endura.integration.strava.web;

import jakarta.validation.constraints.NotBlank;

public class AuthorizationCodeRequest {

    @NotBlank
    private String code;

    private String state;

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getState() {
        return state;
    }

    public void setState(String state) {
        this.state = state;
    }
}
