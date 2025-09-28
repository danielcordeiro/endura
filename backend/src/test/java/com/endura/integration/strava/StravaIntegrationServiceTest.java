package com.endura.integration.strava;

import com.endura.integration.strava.dto.StravaActivity;
import com.endura.integration.strava.dto.StravaTokenResponse;
import java.io.IOException;
import java.time.Instant;
import java.util.List;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import okhttp3.mockwebserver.RecordedRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.reactive.function.client.WebClient;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class StravaIntegrationServiceTest {

    private MockWebServer apiServer;
    private MockWebServer authServer;
    private StravaIntegrationProperties properties;
    private StravaIntegrationService service;

    @BeforeEach
    void setUp() throws IOException {
        apiServer = new MockWebServer();
        authServer = new MockWebServer();
        apiServer.start();
        authServer.start();

        properties = new StravaIntegrationProperties();
        properties.setClientId("clientId");
        properties.setClientSecret("clientSecret");
        properties.setRedirectUri("http://localhost/callback");
        properties.setBaseUrl(apiServer.url("/api/" ).toString());
        properties.setAuthUrl(authServer.url("/oauth/").toString());

        WebClient apiClient = WebClient.builder().baseUrl(properties.getBaseUrl()).build();
        WebClient authClient = WebClient.builder().baseUrl(properties.getAuthUrl()).build();
        service = new StravaIntegrationService(apiClient, authClient, properties);
    }

    @AfterEach
    void tearDown() throws IOException {
        apiServer.shutdown();
        authServer.shutdown();
    }

    @Test
    void shouldBuildAuthorizationUrlWithDefaults() {
        String authorizationUrl = service.buildAuthorizationUrl("state123", List.of());

        assertThat(authorizationUrl)
            .startsWith(properties.getAuthUrl())
            .contains("client_id=" + properties.getClientId())
            .contains("redirect_uri=" + properties.getRedirectUri())
            .contains("state=state123")
            .contains("scope=read,profile:read_all,activity:read_all");
    }

    @Test
    void shouldExchangeAuthorizationCodeForTokens() throws InterruptedException {
        authServer.enqueue(new MockResponse()
            .setHeader("Content-Type", "application/json")
            .setBody("{" +
                "\"token_type\":\"Bearer\"," +
                "\"access_token\":\"access123\"," +
                "\"refresh_token\":\"refresh456\"," +
                "\"expires_at\":1700000000," +
                "\"expires_in\":21600" +
                "}"));

        StravaTokenResponse response = service.exchangeAuthorizationCode("code-123");

        RecordedRequest recordedRequest = authServer.takeRequest();
        assertThat(recordedRequest.getPath()).isEqualTo("/oauth/token");
        assertThat(recordedRequest.getBody().readUtf8())
            .contains("client_id=clientId")
            .contains("client_secret=clientSecret")
            .contains("code=code-123")
            .contains("grant_type=authorization_code");

        assertThat(response.getAccessToken()).isEqualTo("access123");
        assertThat(response.getRefreshToken()).isEqualTo("refresh456");
        assertThat(response.getExpiresAt()).isEqualTo(1700000000);
    }

    @Test
    void shouldRefreshAccessToken() throws InterruptedException {
        authServer.enqueue(new MockResponse()
            .setHeader("Content-Type", "application/json")
            .setBody("{" +
                "\"access_token\":\"newAccess\"," +
                "\"refresh_token\":\"newRefresh\"," +
                "\"expires_at\":1700000001," +
                "\"expires_in\":21600" +
                "}"));

        StravaTokenResponse response = service.refreshToken("refresh-123");

        RecordedRequest recordedRequest = authServer.takeRequest();
        assertThat(recordedRequest.getPath()).isEqualTo("/oauth/token");
        assertThat(recordedRequest.getBody().readUtf8())
            .contains("refresh_token=refresh-123")
            .contains("grant_type=refresh_token");
        assertThat(response.getAccessToken()).isEqualTo("newAccess");
    }

    @Test
    void shouldListRecentActivities() throws Exception {
        String json = "[" +
            "{" +
            "\"id\":1," +
            "\"name\":\"Morning Run\"," +
            "\"distance\":5000.0," +
            "\"moving_time\":1500," +
            "\"elapsed_time\":1800" +
            "}" +
            "]";
        apiServer.enqueue(new MockResponse().setHeader("Content-Type", "application/json").setBody(json));

        List<StravaActivity> activities = service.listRecentActivities("token-xyz", Instant.parse("2024-01-01T00:00:00Z"), null, 1, 30);

        RecordedRequest request = apiServer.takeRequest();
        assertThat(request.getPath()).isEqualTo("/api/athlete/activities?after=1704067200&page=1&per_page=30");
        assertThat(request.getHeader("Authorization")).isEqualTo("Bearer token-xyz");
        assertThat(activities).hasSize(1);
        assertThat(activities.get(0).getName()).isEqualTo("Morning Run");
    }

    @Test
    void shouldPropagateApiErrors() {
        authServer.enqueue(new MockResponse().setResponseCode(400).setBody("{\"message\":\"error\"}"));

        assertThatThrownBy(() -> service.exchangeAuthorizationCode("invalid"))
            .isInstanceOf(StravaApiException.class)
            .hasMessageContaining("status 400");
    }
}
