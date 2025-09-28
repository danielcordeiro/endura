package com.endura.controller.auth;

import com.endura.common.dto.AuthResponse;
import com.endura.common.dto.LoginRequest;
import com.endura.common.dto.RegisterRequest;
import com.endura.common.dto.StravaCallbackRequest;
import com.endura.common.security.JwtTokenProvider;
import com.endura.domain.user.User;
import com.endura.domain.user.UserService;
import com.endura.integration.strava.StravaIntegrationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*", maxAge = 3600)
public class AuthController {
    
    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);
    
    @Autowired
    private AuthenticationManager authenticationManager;
    
    @Autowired
    private UserService userService;
    
    @Autowired
    private JwtTokenProvider jwtTokenProvider;
    
    @Autowired
    private StravaIntegrationService stravaIntegrationService;
    
    @Value("${app.strava.clientId}")
    private String stravaClientId;
    
    @Value("${app.frontend.url}")
    private String frontendUrl;
    
    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                    loginRequest.getEmail(),
                    loginRequest.getPassword()
                )
            );
            
            SecurityContextHolder.getContext().setAuthentication(authentication);
            
            User user = userService.findByEmail(loginRequest.getEmail())
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
            
            String jwt = jwtTokenProvider.generateToken(authentication);
            String refreshToken = jwtTokenProvider.generateRefreshToken(authentication);
            
            boolean stravaConnected = stravaIntegrationService.isUserConnectedToStrava(user.getId());
            
            AuthResponse authResponse = new AuthResponse(
                jwt,
                refreshToken,
                user.getId(),
                user.getEmail(),
                user.getName(),
                stravaConnected
            );
            
            return ResponseEntity.ok(authResponse);
            
        } catch (Exception e) {
            logger.error("Erro na autenticação: ", e);
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Credenciais inválidas"));
        }
    }
    
    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@Valid @RequestBody RegisterRequest registerRequest) {
        try {
            if (userService.existsByEmail(registerRequest.getEmail())) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "Email já está em uso"));
            }
            
            User user = userService.createUser(
                registerRequest.getFirstName() + " " + registerRequest.getLastName(),
                registerRequest.getEmail(),
                registerRequest.getPassword()
            );
            
            // Automatically authenticate the new user
            Authentication authentication = new UsernamePasswordAuthenticationToken(
                user.getEmail(), null, null
            );
            
            String jwt = jwtTokenProvider.generateToken(authentication);
            String refreshToken = jwtTokenProvider.generateRefreshToken(authentication);
            
            AuthResponse authResponse = new AuthResponse(
                jwt,
                refreshToken,
                user.getId(),
                user.getEmail(),
                user.getName(),
                false // New user won't have Strava connected
            );
            
            return ResponseEntity.ok(authResponse);
            
        } catch (Exception e) {
            logger.error("Erro no registro: ", e);
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Erro interno do servidor"));
        }
    }
    
    @PostMapping("/refresh")
    public ResponseEntity<?> refreshToken(@RequestBody Map<String, String> request) {
        try {
            String refreshToken = request.get("refreshToken");
            
            if (!jwtTokenProvider.validateToken(refreshToken)) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "Token de refresh inválido"));
            }
            
            String email = jwtTokenProvider.getUsernameFromToken(refreshToken);
            User user = userService.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
            
            Authentication authentication = new UsernamePasswordAuthenticationToken(
                user.getEmail(), null, null
            );
            
            String newJwt = jwtTokenProvider.generateToken(authentication);
            String newRefreshToken = jwtTokenProvider.generateRefreshToken(authentication);
            
            boolean stravaConnected = stravaIntegrationService.isUserConnectedToStrava(user.getId());
            
            AuthResponse authResponse = new AuthResponse(
                newJwt,
                newRefreshToken,
                user.getId(),
                user.getEmail(),
                user.getName(),
                stravaConnected
            );
            
            return ResponseEntity.ok(authResponse);
            
        } catch (Exception e) {
            logger.error("Erro ao renovar token: ", e);
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Erro interno do servidor"));
        }
    }
    
    @GetMapping("/strava/url")
    public ResponseEntity<?> getStravaAuthUrl() {
        try {
            String authUrl = String.format(
                "https://www.strava.com/oauth/authorize?client_id=%s&response_type=code&redirect_uri=%s/auth/strava/callback&approval_prompt=force&scope=read,activity:read_all",
                stravaClientId,
                frontendUrl
            );
            
            return ResponseEntity.ok(Map.of("url", authUrl));
            
        } catch (Exception e) {
            logger.error("Erro ao gerar URL do Strava: ", e);
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Erro interno do servidor"));
        }
    }
    
    @PostMapping("/strava/callback")
    public ResponseEntity<?> handleStravaCallback(@Valid @RequestBody StravaCallbackRequest request) {
        try {
            // Obter usuário autenticado
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String email = authentication.getName();
            
            User user = userService.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
            
            logger.info("Processando callback do Strava para usuário: {} com código: {}", email, request.getCode());
            
            // Trocar código por tokens via Strava API
            stravaIntegrationService.exchangeCodeForToken(request.getCode())
                .subscribe(
                    tokenResponse -> {
                        try {
                            // Salvar integração no banco de dados
                            stravaIntegrationService.saveIntegration(user, tokenResponse);
                            logger.info("Integração Strava salva com sucesso para usuário: {}", user.getId());
                        } catch (Exception e) {
                            logger.error("Erro ao salvar integração Strava: ", e);
                        }
                    },
                    error -> {
                        logger.error("Erro ao trocar código Strava por tokens: ", error);
                    }
                );
            
            return ResponseEntity.ok(Map.of(
                "message", "Callback do Strava processado com sucesso",
                "stravaConnected", true
            ));
            
        } catch (Exception e) {
            logger.error("Erro no callback do Strava: ", e);
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Erro ao processar callback do Strava"));
        }
    }
    
    @DeleteMapping("/strava/disconnect")
    public ResponseEntity<?> disconnectStrava() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String email = authentication.getName();
            
            User user = userService.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
            
            stravaIntegrationService.disconnectUser(user.getId());
            
            return ResponseEntity.ok(Map.of(
                "message", "Conta Strava desconectada com sucesso",
                "stravaConnected", false
            ));
            
        } catch (Exception e) {
            logger.error("Erro ao desconectar Strava: ", e);
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Erro ao desconectar Strava"));
        }
    }
    
    @GetMapping("/strava/status")
    public ResponseEntity<?> getStravaStatus() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String email = authentication.getName();
            
            User user = userService.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
            
            boolean connected = stravaIntegrationService.isUserConnectedToStrava(user.getId());
            
            return ResponseEntity.ok(Map.of("stravaConnected", connected));
            
        } catch (Exception e) {
            logger.error("Erro ao verificar status Strava: ", e);
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Erro interno do servidor"));
        }
    }
}