# Endura Backend

Backend API do aplicativo Endura desenvolvido com Spring Boot e Java 17.

## 🛠️ Tecnologias

- **Spring Boot 3.2** - Framework principal
- **Java 17** - Linguagem de programação
- **Spring Security** - Autenticação e autorização
- **Spring Data JPA** - Persistência de dados
- **PostgreSQL** - Banco de dados
- **JWT** - Tokens de autenticação
- **Maven** - Gerenciamento de dependências
- **Flyway** - Migração de banco de dados
- **OpenAPI 3** - Documentação da API

## 📋 Pré-requisitos

- Java 17 ou superior
- Maven 3.8 ou superior
- PostgreSQL 12+ (ou Docker)

## 🚀 Instalação e Execução

### 1. Clonar e navegar para o diretório
```bash
cd backend
```

### 2. Configurar variáveis de ambiente
Copie o arquivo de exemplo e configure:
```bash
cp .env.example .env
```

Edite o arquivo `.env` na raiz do projeto:
```bash
# Database Configuration
DATABASE_URL=jdbc:postgresql://localhost:5432/endura
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRATION=86400000

# External APIs
STRAVA_CLIENT_ID=your_strava_client_id
STRAVA_CLIENT_SECRET=your_strava_client_secret
GARMIN_CONSUMER_KEY=your_garmin_consumer_key
GARMIN_CONSUMER_SECRET=your_garmin_consumer_secret
OPENAI_API_KEY=your_openai_api_key
```

### 3. Instalar dependências
```bash
mvn clean install
```

### 4. Configurar banco de dados

#### Opção A: PostgreSQL Local
```bash
# Instalar PostgreSQL e criar banco
createdb endura
```

#### Opção B: Docker
```bash
docker run --name endura-postgres \
  -e POSTGRES_DB=endura \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 -d postgres:15
```

### 5. Executar aplicação
```bash
mvn spring-boot:run
```

A API estará disponível em: http://localhost:8080/api

### 6. Documentação da API
Acesse: http://localhost:8080/swagger-ui/index.html

## 🏗️ Build e Deploy

### Build para produção
```bash
mvn clean package
```

### Executar JAR
```bash
java -jar target/endura-backend-1.0.0.jar
```

### Executar com profile específico
```bash
mvn spring-boot:run -Dspring-boot.run.profiles=prod
```

## 🧪 Testes

### Executar todos os testes
```bash
mvn test
```

### Executar testes específicos
```bash
mvn test -Dtest=UserServiceTest
```

### Executar com coverage
```bash
mvn jacoco:report
```

## 🔧 Scripts Maven Disponíveis

- `mvn compile` - Compila o projeto
- `mvn test` - Executa testes
- `mvn spring-boot:run` - Executa a aplicação
- `mvn clean package` - Gera JAR de produção
- `mvn flyway:migrate` - Executa migrações do banco
- `mvn dependency:tree` - Mostra árvore de dependências

## 📁 Estrutura do Projeto

```
src/main/java/com/endura/
├── config/              # Configurações (Security, CORS, etc.)
├── domain/
│   ├── user/           # Entidades, repositórios e serviços de usuário
│   ├── workout/        # Entidades, repositórios e serviços de treino
│   ├── supplement/     # Entidades, repositórios e serviços de suplemento
│   └── integration/    # Integrações com APIs externas
├── integration/
│   ├── strava/         # Integração com Strava API
│   ├── garmin/         # Integração com Garmin API
│   └── trainingpeaks/  # Integração com TrainingPeaks API
├── common/
│   ├── dto/            # Data Transfer Objects
│   ├── exception/      # Exceções customizadas
│   └── util/           # Utilitários
└── EnduraApplication.java
```

## 🗄️ Banco de Dados

### Migrações Flyway
As migrações estão em: `src/main/resources/db/migration/`

### Executar migrações manualmente
```bash
mvn flyway:migrate
```

### Schema principal
- `users` - Usuários do sistema
- `workouts` - Treinos/atividades
- `supplements` - Suplementação
- `integrations` - Integrações com APIs externas

## 🔐 Segurança

### JWT Authentication
A API usa JWT para autenticação. Endpoints protegidos requerem header:
```
Authorization: Bearer <token>
```

### Endpoints públicos
- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/actuator/health`

## 📋 API Endpoints

### Autenticação
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Registro
- `POST /api/auth/refresh` - Refresh token

### Usuários
- `GET /api/users/profile` - Perfil do usuário
- `PUT /api/users/profile` - Atualizar perfil

### Treinos
- `GET /api/workouts` - Listar treinos
- `POST /api/workouts` - Criar treino
- `GET /api/workouts/{id}` - Obter treino
- `POST /api/workouts/sync` - Sincronizar com APIs externas

### Suplementos
- `GET /api/supplements` - Listar suplementos
- `POST /api/supplements` - Criar suplemento
- `POST /api/supplements/analyze-image` - Analisar imagem

## 🐳 Docker

### Executar com Docker
```bash
# Build da imagem
docker build -t endura-backend .

# Executar container
docker run -p 8080:8080 endura-backend
```

### Docker Compose (na raiz do projeto)
```bash
docker-compose up backend
```

## 🔄 Integrações Externas

### APIs Suportadas
- **Strava API** - Sincronização de atividades
- **Garmin Connect** - Dados de dispositivos
- **TrainingPeaks** - Planos de treino
- **OpenAI** - Análise de imagens e texto

### Configuração OAuth
Cada API externa requer configuração OAuth no respectivo portal do desenvolvedor.

## 🚨 Troubleshooting

### Problemas comuns:

1. **Erro de conexão com banco**:
   ```bash
   # Verificar se PostgreSQL está rodando
   pg_isready -h localhost -p 5432
   ```

2. **Erro de migração Flyway**:
   ```bash
   # Resetar migrações (CUIDADO: apaga dados)
   mvn flyway:clean flyway:migrate
   ```

3. **Problemas com JWT**:
   - Verificar se `JWT_SECRET` está configurado
   - Verificar expiração do token

### Logs úteis:
```bash
# Executar com logs detalhados
mvn spring-boot:run -Dlogging.level.com.endura=DEBUG

# Ver logs do Docker
docker-compose logs backend
```

## 📊 Monitoramento

### Health Check
```bash
curl http://localhost:8080/api/actuator/health
```

### Métricas
```bash
curl http://localhost:8080/api/actuator/metrics
```

### Logs da aplicação
Os logs são salvos em: `logs/endura.log`

## 📚 Recursos Adicionais

- [Spring Boot Documentation](https://spring.io/projects/spring-boot)
- [Spring Security Reference](https://docs.spring.io/spring-security/reference/)
- [Spring Data JPA Guide](https://spring.io/guides/gs/accessing-data-jpa/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [JWT.io](https://jwt.io/)