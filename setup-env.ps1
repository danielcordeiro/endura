# Configuração das variáveis de ambiente para o projeto Endura
# Execute este script antes de iniciar o backend para configurar as variáveis necessárias

Write-Host "Configurando variáveis de ambiente..." -ForegroundColor Green

# Configuração do banco de dados
$env:DATABASE_URL = "jdbc:postgresql://localhost:5432/endura"
$env:DATABASE_USERNAME = "postgres"
$env:DATABASE_PASSWORD = "123456"

# Configuração JWT
$env:JWT_SECRET = "your-super-secret-jwt-key-here-make-it-long-and-complex-for-development"
$env:JWT_EXPIRATION = "86400000"

# Configuração CORS
$env:CORS_ALLOWED_ORIGINS = "http://localhost:3000"

# Configuração Strava (substitua pelos valores reais)
$env:STRAVA_CLIENT_ID = "your_strava_client_id"
$env:STRAVA_CLIENT_SECRET = "your_strava_client_secret"
$env:STRAVA_REDIRECT_URI = "http://localhost:3000/auth/strava/callback"

Write-Host "Variáveis de ambiente configuradas com sucesso!" -ForegroundColor Green
Write-Host "Para usar essas variáveis, execute este script antes de iniciar o backend:" -ForegroundColor Yellow
Write-Host ".\setup-env.ps1; .\start-backend.ps1" -ForegroundColor Cyan