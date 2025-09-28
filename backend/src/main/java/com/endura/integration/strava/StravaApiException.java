package com.endura.integration.strava;

import org.springframework.http.HttpStatusCode;

public class StravaApiException extends RuntimeException {

    private final HttpStatusCode statusCode;
    private final String responseBody;

    public StravaApiException(HttpStatusCode statusCode, String responseBody) {
        super("Strava API request failed with status %s".formatted(statusCode));
        this.statusCode = statusCode;
        this.responseBody = responseBody;
    }

    public HttpStatusCode getStatusCode() {
        return statusCode;
    }

    public String getResponseBody() {
        return responseBody;
    }
}
