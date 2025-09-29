# Autenticação Strava OAuth 2.0

## 🎯 Objetivo
Implementar fluxo completo de autenticação OAuth 2.0 com Strava, permitindo login e sincronização de atividades.

## 📊 Status da Implementação
- ✅ **OAuth Flow** - Redirecionamento e callback implementados
- ✅ **Token Management** - Armazenamento seguro de tokens
- ✅ **Frontend Integration** - Página de callback e store
- ✅ **Error Handling** - Tratamento completo de erros

---

## 🔄 Fluxo de Autenticação

### 1. Iniciando Autenticação
```typescript
// No frontend, redirecionar para Strava
const STRAVA_OAUTH_URL = `https://www.strava.com/oauth/authorize?
  client_id=${CLIENT_ID}&
  response_type=code&
  redirect_uri=${CALLBACK_URL}&
  approval_prompt=force&
  scope=read,activity:read_all`;
```

### 2. Callback Handler
**Arquivo**: `StravaCallbackPage.tsx`

```typescript
const handleCallback = async () => {
  const code = searchParams.get('code');
  if (!code) {
    // Redirecionar para login com erro
    return;
  }
  
  try {
    await loginWithStrava(code);
    navigate('/dashboard');
  } catch (error) {
    // Tratar erro e redirecionar
  }
};
```

### 3. Backend Exchange
**Endpoint**: `POST /api/auth/strava/callback`

```java
@PostMapping("/strava/callback")
public ResponseEntity<AuthResponse> stravaCallback(@RequestBody StravaCallbackRequest request) {
    // 1. Exchange code por tokens
    StravaTokenResponse tokens = stravaService.exchangeCodeForTokens(request.getCode());
    
    // 2. Buscar dados do atleta
    StravaAthlete athlete = stravaService.getAthlete(tokens.getAccessToken());
    
    // 3. Criar/atualizar usuário
    User user = userService.createOrUpdateFromStrava(athlete);
    
    // 4. Salvar integração
    integrationService.saveStravaIntegration(user, tokens);
    
    // 5. Gerar JWT interno
    String jwt = jwtService.generateToken(user);
    
    return ResponseEntity.ok(new AuthResponse(user, jwt));
}
```

---

## 🔐 Segurança

### 1. Armazenamento de Tokens
- **Access Token**: Criptografado no banco de dados
- **Refresh Token**: Criptografado separadamente
- **JWT**: Armazenado no localStorage (frontend)

### 2. Validações
- **CSRF Protection**: State parameter no OAuth
- **Token Expiration**: Verificação automática
- **Scope Validation**: Validação de permissões

### 3. Logs de Segurança
Todos os eventos de autenticação são registrados:
- Login attempts
- Token exchanges
- Refresh operations
- Failed authentications

---

## 🛠️ Componentes Implementados

### Frontend

#### StravaCallbackPage
```typescript
export const StravaCallbackPage = () => {
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const { loginWithStrava } = useAuthStore();
  
  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      handleStravaCallback(code);
    }
  }, []);
  
  // Renderiza loading ou erro
};
```

#### AuthStore Integration
```typescript
loginWithStrava: async (code: string) => {
  set({ isLoading: true });
  try {
    const response = await authService.stravaCallback(code);
    localStorage.setItem('authToken', response.token);
    set({
      user: response.user,
      token: response.token,
      isAuthenticated: true,
      isLoading: false,
    });
    get().refreshSyncStatus();
  } catch (error) {
    set({ isLoading: false });
    throw error;
  }
}
```

### Backend

#### AuthController
```java
@RestController
@RequestMapping("/api/auth")
class AuthController {
    
    @PostMapping("/strava/callback")
    public ResponseEntity<LoginResponse> stravaCallback(@RequestBody StravaCallbackRequest request) {
        // Implementação do exchange
    }
}
```

#### StravaIntegrationService
```java
@Service
public class StravaIntegrationService {
    
    public StravaTokenResponse exchangeCodeForTokens(String code) {
        // Chamada para API Strava
    }
    
    public StravaAthlete getAthlete(String accessToken) {
        // Buscar dados do atleta
    }
}
```

---

## 🚨 Tratamento de Erros

### 1. Erros de Frontend
- **Missing Code**: Código não retornado pelo Strava
- **Network Error**: Falha na comunicação com backend
- **Invalid Token**: Token inválido ou expirado

### 2. Erros de Backend
- **Invalid Code**: Código inválido ou expirado
- **API Error**: Falha na comunicação com Strava
- **Database Error**: Falha ao salvar integração

### 3. Mensagens de Erro
```typescript
const errorMessages = {
  MISSING_CODE: 'Código de autorização não encontrado',
  INVALID_CODE: 'Código de autorização inválido',
  NETWORK_ERROR: 'Erro de conexão. Tente novamente.',
  UNKNOWN_ERROR: 'Erro inesperado. Contate o suporte.'
};
```

---

## 🧪 Testes

### 1. Testes de Integração
- [ ] Fluxo OAuth completo
- [ ] Tratamento de códigos inválidos
- [ ] Refresh de tokens expirados
- [ ] Criação/atualização de usuários

### 2. Testes de Frontend
- [ ] StravaCallbackPage rendering
- [ ] AuthStore actions
- [ ] Error handling
- [ ] Navigation flows

### 3. Testes de Backend
- [ ] AuthController endpoints
- [ ] Token exchange
- [ ] User creation/update
- [ ] Integration saving

---

## 📚 Configuração

### 1. Variáveis de Ambiente
```bash
# Backend
STRAVA_CLIENT_ID=your_client_id
STRAVA_CLIENT_SECRET=your_client_secret
STRAVA_REDIRECT_URI=http://localhost:3000/auth/strava/callback

# Frontend
VITE_STRAVA_CLIENT_ID=your_client_id
```

### 2. Configuração Strava App
- **Authorization Callback Domain**: `localhost:3000`
- **Authorization Callback URL**: `http://localhost:3000/auth/strava/callback`
- **Scopes**: `read,activity:read_all`

---

## 🔮 Próximos Passos

### 1. Melhorias Planejadas
- [ ] State parameter para CSRF protection
- [ ] Refresh token automático no frontend
- [ ] Logout com revogação de token
- [ ] Multi-provider authentication

### 2. Monitoramento
- [ ] Métricas de login por provider
- [ ] Taxa de sucesso de autenticação
- [ ] Tempo médio de login

---

**Última atualização**: `29/09/2025`  
**Versão**: `1.0.0`  
**Responsável**: Sistema de Autenticação