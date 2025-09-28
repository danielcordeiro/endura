# Especificações Técnicas - Endura

## 🏗️ Arquitetura Detalhada

### Frontend Architecture

#### Component Structure
```
src/
├── components/
│   ├── ui/
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.test.tsx
│   │   │   └── index.ts
│   │   ├── Input/
│   │   ├── Modal/
│   │   └── ...
│   ├── forms/
│   │   ├── WorkoutForm/
│   │   ├── SupplementForm/
│   │   └── AuthForm/
│   └── charts/
│       ├── PerformanceChart/
│       ├── SupplementChart/
│       └── ProgressChart/
```

#### State Management (Zustand)
```typescript
// stores/authStore.ts
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

// stores/workoutStore.ts
interface WorkoutState {
  workouts: Workout[];
  currentWorkout: Workout | null;
  isLoading: boolean;
  fetchWorkouts: () => Promise<void>;
  syncWithStrava: () => Promise<void>;
  addSupplement: (supplement: Supplement) => void;
}
```

#### API Layer
```typescript
// services/api.ts
class ApiClient {
  private baseURL: string;
  private token: string | null;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_BASE_URL;
    this.token = localStorage.getItem('auth_token');
  }

  async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    // Implementation with interceptors, error handling, etc.
  }
}

// services/workoutService.ts
export const workoutService = {
  getWorkouts: (): Promise<Workout[]> => api.get('/workouts'),
  createWorkout: (workout: CreateWorkoutDto): Promise<Workout> => 
    api.post('/workouts', workout),
  syncWithStrava: (): Promise<SyncResult> => 
    api.post('/workouts/sync'),
};
```

### Backend Architecture

#### Domain-Driven Design Structure
```
src/main/java/com/endura/
├── config/
│   ├── SecurityConfig.java
│   ├── DatabaseConfig.java
│   ├── IntegrationConfig.java
│   └── SwaggerConfig.java
├── domain/
│   ├── user/
│   │   ├── User.java
│   │   ├── UserRepository.java
│   │   ├── UserService.java
│   │   └── UserController.java
│   ├── workout/
│   │   ├── Workout.java
│   │   ├── WorkoutRepository.java
│   │   ├── WorkoutService.java
│   │   └── WorkoutController.java
│   └── supplement/
├── integration/
│   ├── strava/
│   ├── garmin/
│   └── trainingpeaks/
├── common/
│   ├── dto/
│   ├── exception/
│   ├── validation/
│   └── util/
└── EnduraApplication.java
```

#### Entity Relationships
```java
@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(unique = true, nullable = false)
    private String email;
    
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    private List<Workout> workouts;
    
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    private List<Integration> integrations;
}

@Entity
@Table(name = "workouts")
public class Workout {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;
    
    @OneToMany(mappedBy = "workout", cascade = CascadeType.ALL)
    private List<Supplement> supplements;
    
    private LocalDateTime startTime;
    private Duration duration;
    private Double distance;
    private String activityType;
    private String externalId; // ID from Strava/Garmin
}

@Entity
@Table(name = "supplements")
public class Supplement {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne
    @JoinColumn(name = "workout_id")
    private Workout workout;
    
    private String name;
    private String category;
    private Double quantity;
    private String unit;
    
    @Enumerated(EnumType.STRING)
    private SupplementPhase phase; // PRE, DURING, POST
}
```

## 🛠️ Configurações de Desenvolvimento

### Vite Configuration (frontend/vite.config.ts)
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@services': path.resolve(__dirname, './src/services'),
      '@types': path.resolve(__dirname, './src/types'),
      '@utils': path.resolve(__dirname, './src/utils'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
```

### TypeScript Configuration (frontend/tsconfig.json)
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@components/*": ["./src/components/*"],
      "@pages/*": ["./src/pages/*"],
      "@services/*": ["./src/services/*"],
      "@types/*": ["./src/types/*"],
      "@utils/*": ["./src/utils/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### Maven Configuration (backend/pom.xml)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
    <modelVersion>4.0.0</modelVersion>
    
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.2.0</version>
        <relativePath/>
    </parent>
    
    <groupId>com.endura</groupId>
    <artifactId>endura-backend</artifactId>
    <version>1.0.0</version>
    <name>Endura Backend</name>
    
    <properties>
        <java.version>17</java.version>
        <spring-doc.version>2.2.0</spring-doc.version>
        <jwt.version>0.12.3</jwt.version>
    </properties>
    
    <dependencies>
        <!-- Spring Boot Starters -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-security</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>
        
        <!-- Database -->
        <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
            <scope>runtime</scope>
        </dependency>
        
        <!-- JWT -->
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-api</artifactId>
            <version>${jwt.version}</version>
        </dependency>
        
        <!-- Documentation -->
        <dependency>
            <groupId>org.springdoc</groupId>
            <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
            <version>${spring-doc.version}</version>
        </dependency>
        
        <!-- Testing -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>
    
    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
</project>
```

## 🗄️ Database Schema

### Supabase Setup
```sql
-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplements ENABLE ROW LEVEL SECURITY;

-- Users table
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    date_of_birth DATE,
    gender VARCHAR(10),
    weight DECIMAL(5,2),
    height INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Integrations table
CREATE TABLE integrations (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL, -- 'strava', 'garmin', 'trainingpeaks'
    external_user_id VARCHAR(255),
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workouts table
CREATE TABLE workouts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    external_id VARCHAR(255), -- ID from external platform
    integration_id BIGINT REFERENCES integrations(id),
    name VARCHAR(255),
    activity_type VARCHAR(50),
    start_time TIMESTAMP WITH TIME ZONE,
    duration INTEGER, -- in seconds
    distance DECIMAL(10,2), -- in meters
    elevation_gain DECIMAL(8,2), -- in meters
    avg_heart_rate INTEGER,
    max_heart_rate INTEGER,
    avg_power INTEGER,
    calories INTEGER,
    perceived_exertion INTEGER, -- 1-10 scale
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Supplements table
CREATE TABLE supplements (
    id BIGSERIAL PRIMARY KEY,
    workout_id BIGINT REFERENCES workouts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(255),
    category VARCHAR(100), -- 'gel', 'isotonic', 'bar', 'capsule', etc.
    quantity DECIMAL(8,2),
    unit VARCHAR(20), -- 'g', 'ml', 'pieces', etc.
    phase VARCHAR(10) NOT NULL, -- 'PRE', 'DURING', 'POST'
    timing_minutes INTEGER, -- minutes from workout start
    carbohydrates DECIMAL(6,2), -- grams
    protein DECIMAL(6,2), -- grams
    fat DECIMAL(6,2), -- grams
    sodium DECIMAL(6,2), -- mg
    caffeine DECIMAL(6,2), -- mg
    image_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_workouts_user_id ON workouts(user_id);
CREATE INDEX idx_workouts_start_time ON workouts(start_time);
CREATE INDEX idx_supplements_workout_id ON supplements(workout_id);
CREATE INDEX idx_integrations_user_id ON integrations(user_id);

-- Row Level Security Policies
CREATE POLICY "Users can only access their own data" ON users FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users can only access their workouts" ON workouts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access their supplements" ON supplements FOR ALL USING (
    auth.uid() = (SELECT user_id FROM workouts WHERE id = workout_id)
);
```

## 🔒 Segurança

### JWT Configuration
```java
@Component
public class JwtUtil {
    @Value("${security.jwt.secret}")
    private String secret;
    
    @Value("${security.jwt.expiration}")
    private Long expiration;
    
    public String generateToken(UserDetails userDetails) {
        Map<String, Object> claims = new HashMap<>();
        return createToken(claims, userDetails.getUsername());
    }
    
    private String createToken(Map<String, Object> claims, String subject) {
        return Jwts.builder()
            .setClaims(claims)
            .setSubject(subject)
            .setIssuedAt(new Date(System.currentTimeMillis()))
            .setExpiration(new Date(System.currentTimeMillis() + expiration))
            .signWith(SignatureAlgorithm.HS512, secret)
            .compact();
    }
}
```

### Security Configuration
```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.csrf(csrf -> csrf.disable())
            .sessionManagement(session -> 
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/public/**").permitAll()
                .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll()
                .anyRequest().authenticated())
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
        
        return http.build();
    }
}
```

## 🔗 Integração com APIs Externas

### Strava Integration
```java
@Service
public class StravaIntegrationService {
    private final WebClient webClient;
    
    public CompletableFuture<List<StravaActivity>> fetchActivities(String accessToken) {
        return webClient.get()
            .uri("https://www.strava.com/api/v3/athlete/activities")
            .headers(h -> h.setBearerAuth(accessToken))
            .retrieve()
            .bodyToFlux(StravaActivity.class)
            .collectList()
            .toFuture();
    }
    
    public CompletableFuture<StravaTokenResponse> refreshToken(String refreshToken) {
        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("client_id", stravaClientId);
        body.add("client_secret", stravaClientSecret);
        body.add("refresh_token", refreshToken);
        body.add("grant_type", "refresh_token");
        
        return webClient.post()
            .uri("https://www.strava.com/oauth/token")
            .contentType(MediaType.APPLICATION_FORM_URLENCODED)
            .body(BodyInserters.fromFormData(body))
            .retrieve()
            .bodyToMono(StravaTokenResponse.class)
            .toFuture();
    }
}
```

## 🧪 Testes

### Frontend Testing (Vitest + React Testing Library)
```typescript
// components/ui/Button/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
  
  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Backend Testing (JUnit 5 + Mockito)
```java
@ExtendWith(MockitoExtension.class)
class WorkoutServiceTest {
    
    @Mock
    private WorkoutRepository workoutRepository;
    
    @Mock
    private StravaIntegrationService stravaService;
    
    @InjectMocks
    private WorkoutService workoutService;
    
    @Test
    void shouldCreateWorkout() {
        // Given
        CreateWorkoutDto dto = new CreateWorkoutDto();
        dto.setName("Morning Run");
        
        Workout savedWorkout = new Workout();
        savedWorkout.setId(1L);
        savedWorkout.setName("Morning Run");
        
        when(workoutRepository.save(any(Workout.class))).thenReturn(savedWorkout);
        
        // When
        Workout result = workoutService.createWorkout(dto, 1L);
        
        // Then
        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getName()).isEqualTo("Morning Run");
        verify(workoutRepository).save(any(Workout.class));
    }
}
```

## 📈 Monitoramento e Observabilidade

### Spring Boot Actuator
```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  endpoint:
    health:
      show-details: always
  metrics:
    export:
      prometheus:
        enabled: true
```

### Logging Configuration
```yaml
logging:
  level:
    com.endura: DEBUG
    org.springframework.security: DEBUG
  pattern:
    console: "%d{HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n"
    file: "%d{yyyy-MM-dd HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n"
  file:
    name: logs/endura.log
```

## 🚀 Deploy e CI/CD

### Docker Configuration
```dockerfile
# Frontend Dockerfile
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```dockerfile
# Backend Dockerfile
FROM openjdk:17-jdk-slim AS build
WORKDIR /app
COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .
RUN ./mvnw dependency:resolve

COPY src src
RUN ./mvnw clean package -DskipTests

FROM openjdk:17-jre-slim
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

### GitHub Actions
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
        working-directory: ./frontend
      - run: npm run test
        working-directory: ./frontend
      - run: npm run build
        working-directory: ./frontend

  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
      - run: ./mvnw clean test
        working-directory: ./backend

  deploy:
    needs: [test-frontend, test-backend]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to production
        run: |
          # Deploy commands here
```

Esta especificação técnica fornece todos os detalhes necessários para implementar o projeto Endura com as tecnologias especificadas. Ela cobre desde a arquitetura até configurações específicas, padrões de código e estratégias de deploy.