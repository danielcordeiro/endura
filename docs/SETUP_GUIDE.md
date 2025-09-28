# Guia de Setup do Ambiente de Desenvolvimento

## 📋 Pré-requisitos

### Softwares Necessários

1. **Node.js** (versão 18 ou superior)
   ```bash
   # Verificar versão
   node --version
   npm --version
   ```

2. **Java** (versão 17 ou superior)
   ```bash
   # Verificar versão
   java --version
   javac --version
   ```

3. **Maven** (versão 3.8 ou superior)
   ```bash
   # Verificar versão
   mvn --version
   ```

4. **Git**
   ```bash
   # Verificar versão
   git --version
   ```

5. **Docker** (opcional, mas recomendado)
   ```bash
   # Verificar versão
   docker --version
   docker-compose --version
   ```

## 🚀 Setup Inicial

### 1. Clone do Repositório
```bash
git clone https://github.com/danielcordeiro/endura.git
cd endura
```

### 2. Configuração do Backend

#### 2.1. Navegar para o diretório do backend
```bash
cd backend
```

#### 2.2. Instalar dependências
```bash
mvn clean install
```

#### 2.3. Configurar variáveis de ambiente
Crie um arquivo `.env` na raiz do projeto backend:

```bash
# Database (Supabase)
SUPABASE_DATABASE_URL=jdbc:postgresql://db.supabasehost.com:5432/postgres
SUPABASE_USERNAME=postgres
SUPABASE_PASSWORD=your_password

# JWT
JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-complex
JWT_EXPIRATION=86400000

# Strava Integration
STRAVA_CLIENT_ID=your_strava_client_id
STRAVA_CLIENT_SECRET=your_strava_client_secret

# Garmin Integration
GARMIN_CONSUMER_KEY=your_garmin_consumer_key
GARMIN_CONSUMER_SECRET=your_garmin_consumer_secret

# TrainingPeaks Integration
TRAININGPEAKS_CLIENT_ID=your_trainingpeaks_client_id
TRAININGPEAKS_CLIENT_SECRET=your_trainingpeaks_client_secret

# OpenAI (para recursos de IA)
OPENAI_API_KEY=your_openai_api_key
```

#### 2.4. Configurar Supabase

1. Acesse [supabase.com](https://supabase.com) e crie uma conta
2. Crie um novo projeto
3. Na seção SQL Editor, execute o script de criação das tabelas:

```sql
-- Script completo disponível em TECHNICAL_SPECS.md
```

4. Configure as Row Level Security policies
5. Obtenha as credenciais de conexão

### 3. Configuração do Frontend

#### 3.1. Navegar para o diretório do frontend
```bash
cd ../frontend
```

#### 3.2. Instalar dependências
```bash
npm install
```

#### 3.3. Configurar variáveis de ambiente
Crie um arquivo `.env` na raiz do projeto frontend:

```bash
# API Backend
VITE_API_BASE_URL=http://localhost:8080/api

# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# External APIs (para OAuth)
VITE_STRAVA_CLIENT_ID=your_strava_client_id
VITE_GARMIN_CONSUMER_KEY=your_garmin_consumer_key
```

## 🔧 Configurações de API Externas

### Strava API Setup

1. Acesse [developers.strava.com](https://developers.strava.com)
2. Crie uma nova aplicação
3. Configure as URLs de callback:
   - **Authorization Callback Domain**: `localhost:3000`
   - **Authorization Callback URL**: `http://localhost:3000/auth/strava/callback`
4. Anote o `Client ID` e `Client Secret`

### Garmin Connect IQ Setup

1. Acesse [developer.garmin.com](https://developer.garmin.com)
2. Registre-se como desenvolvedor
3. Crie uma nova aplicação Connect IQ
4. Configure as chaves de API
5. Anote o `Consumer Key` e `Consumer Secret`

### TrainingPeaks API Setup

1. Acesse [trainingpeaks.com/developer](https://www.trainingpeaks.com/developer)
2. Solicite acesso à API
3. Crie uma aplicação
4. Configure as URLs de callback
5. Anote as credenciais

### OpenAI API Setup

1. Acesse [platform.openai.com](https://platform.openai.com)
2. Crie uma conta e configure o billing
3. Gere uma API Key
4. Configure os limites de uso

## 🏃‍♂️ Executando o Projeto

### Opção 1: Execução Manual

#### Terminal 1 - Backend
```bash
cd backend
mvn spring-boot:run
```

#### Terminal 2 - Frontend
```bash
cd frontend
npm run dev
```

### Opção 2: Docker (Recomendado)

#### 2.1. Criar docker-compose.yml na raiz do projeto
```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
    environment:
      - SPRING_PROFILES_ACTIVE=docker
    env_file:
      - ./backend/.env
    depends_on:
      - db

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:80"
    depends_on:
      - backend

  db:
    image: postgres:15
    environment:
      POSTGRES_DB: endura
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

#### 2.2. Executar com Docker
```bash
docker-compose up -d
```

## 📦 Scripts Úteis

### Frontend (package.json)
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "lint:fix": "eslint . --ext ts,tsx --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx,json,css,md}\"",
    "type-check": "tsc --noEmit"
  }
}
```

### Backend (Maven)
```bash
# Compilar o projeto
mvn compile

# Executar testes
mvn test

# Executar aplicação
mvn spring-boot:run

# Gerar JAR
mvn clean package

# Executar com profile específico
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

## 🔍 Verificação do Setup

### 1. Verificar Backend
Acesse: `http://localhost:8080/actuator/health`

Resposta esperada:
```json
{
  "status": "UP"
}
```

### 2. Verificar Frontend
Acesse: `http://localhost:3000`

Você deve ver a página inicial do Endura.

### 3. Verificar API Documentation
Acesse: `http://localhost:8080/swagger-ui/index.html`

Documentação interativa da API deve estar disponível.

### 4. Verificar Database
```bash
# Se usando Docker
docker-compose exec db psql -U postgres -d endura

# Listar tabelas
\dt
```

## 🐛 Troubleshooting

### Problemas Comuns

#### 1. Erro de CORS
**Problema**: Frontend não consegue acessar backend
**Solução**: Verificar configuração CORS no backend

```java
@Configuration
@EnableWebMvc
public class WebConfig implements WebMvcConfigurer {
    
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins("http://localhost:3000")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);
    }
}
```

#### 2. Erro de Conexão com Database
**Problema**: Aplicação não conecta com Supabase
**Solução**: 
1. Verificar credenciais no `.env`
2. Verificar se IP está na whitelist do Supabase
3. Testar conexão manual:

```bash
psql -h db.supabasehost.com -U postgres -d postgres
```

#### 3. Problemas com JWT
**Problema**: Token inválido ou expirado
**Solução**:
1. Verificar `JWT_SECRET` no backend
2. Limpar localStorage no frontend
3. Verificar tempo de expiração

#### 4. APIs Externas não funcionam
**Problema**: Integração com Strava/Garmin falha
**Solução**:
1. Verificar credenciais das APIs
2. Confirmar URLs de callback
3. Verificar rate limits
4. Testar com Postman/Insomnia

### Logs Úteis

#### Backend Logs
```bash
# Executar com logs detalhados
mvn spring-boot:run -Dlogging.level.com.endura=DEBUG

# Ver logs do Docker
docker-compose logs backend
```

#### Frontend Logs
```bash
# Console do navegador (F12)
# Ou logs do Vite
npm run dev -- --debug
```

## 📚 Recursos Adicionais

### Documentação das APIs
- [Strava API v3](https://developers.strava.com/docs/reference/)
- [Garmin Connect IQ](https://developer.garmin.com/connect-iq/api-docs/)
- [TrainingPeaks API](https://www.trainingpeaks.com/developer/api/)
- [OpenAI API](https://platform.openai.com/docs)

### Ferramentas Recomendadas

#### IDEs
- **Frontend**: VS Code + extensões React/TypeScript
- **Backend**: IntelliJ IDEA ou VS Code + Extension Pack for Java

#### Extensões VS Code
- ES7+ React/Redux/React-Native snippets
- TypeScript Importer
- Prettier - Code formatter
- ESLint
- GitLens
- Thunder Client (para testar APIs)

#### Ferramentas de Database
- DBeaver
- pgAdmin 4
- Supabase Dashboard

#### Teste de APIs
- Postman
- Insomnia
- Thunder Client (VS Code)

Com este guia, você deve conseguir configurar completamente o ambiente de desenvolvimento do projeto Endura. Se encontrar algum problema, consulte a seção de troubleshooting ou abra uma issue no repositório.