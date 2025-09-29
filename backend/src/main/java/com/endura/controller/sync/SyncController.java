package com.endura.controller.sync;

import com.endura.integration.strava.StravaIntegrationService;
import com.endura.common.security.JwtTokenProvider;
import com.endura.domain.user.User;
import com.endura.domain.user.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/sync")
@CrossOrigin(origins = "http://localhost:3000")
public class SyncController {

    @Autowired
    private StravaIntegrationService stravaIntegrationService;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;
    
    @Autowired
    private UserRepository userRepository;

    @PostMapping("/strava/activities")
    public ResponseEntity<?> syncStravaActivities(@RequestHeader("Authorization") String token) {
        try {
            String jwtToken = token.replace("Bearer ", "");
            String username = jwtTokenProvider.getUsernameFromToken(jwtToken);
            
            User user = userRepository.findByEmail(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
            
            int syncedCount = stravaIntegrationService.syncUserActivities(user.getId());
            
            return ResponseEntity.ok(Map.of(
                "message", "Activities synchronized successfully",
                "syncedCount", syncedCount
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Failed to sync activities: " + e.getMessage()
            ));
        }
    }

    @GetMapping("/strava/status/{userId}")
    public ResponseEntity<?> getSyncStatus(@PathVariable Long userId, @RequestHeader("Authorization") String token) {
        try {
            String jwtToken = token.replace("Bearer ", "");
            String username = jwtTokenProvider.getUsernameFromToken(jwtToken);
            
            User user = userRepository.findByEmail(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
            
            Map<String, Object> status = stravaIntegrationService.getSyncStatus(user.getId());
            return ResponseEntity.ok(status);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Failed to get sync status: " + e.getMessage()
            ));
        }
    }
}