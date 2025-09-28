# Script completo para inicializar o backend do Endura
# Configura ambiente, variáveis e inicia a aplicação

Write-Host "=== INICIANDO BACKEND ENDURA ===" -ForegroundColor Cyan

# Configurar Java 17
Write-Host "1. Configurando Java 17..." -ForegroundColor Green
$env:JAVA_HOME = "C:\Program Files\Java\jdk-17"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"

# Verificar Java
Write-Host "2. Verificando versão do Java..." -ForegroundColor Yellow
java -version

# Configurar variáveis de ambiente
Write-Host "3. Configurando variáveis de ambiente..." -ForegroundColor Green
$env:DATABASE_URL = "jdbc:postgresql://localhost:5432/endura"
$env:DATABASE_USERNAME = "postgres"
$env:DATABASE_PASSWORD = "123456"
$env:JWT_SECRET = "your-super-secret-jwt-key-here-make-it-long-and-complex-for-development"
$env:JWT_EXPIRATION = "86400000"
$env:CORS_ALLOWED_ORIGINS = "http://localhost:3000"
$env:STRAVA_CLIENT_ID = "your_strava_client_id"
$env:STRAVA_CLIENT_SECRET = "your_strava_client_secret"
$env:STRAVA_REDIRECT_URI = "http://localhost:3000/auth/strava/callback"

# Navegar para backend
Write-Host "4. Navegando para diretório backend..." -ForegroundColor Green
if (Test-Path "backend") {
    Set-Location "backend"
} else {
    Write-Host "Erro: Diretório backend não encontrado!" -ForegroundColor Red
    exit 1
}

# Iniciar aplicação
Write-Host "5. Iniciando aplicação Spring Boot..." -ForegroundColor Green
Write-Host "Backend será executado em: http://localhost:8080/api" -ForegroundColor Cyan
Write-Host "Console H2 Database: http://localhost:8080/api/h2-console" -ForegroundColor Yellow
mvn spring-boot:run "-Dspring.profiles.active=dev"