# Script para inicializar Frontend e Backend do Endura
# Autor: Sistema automatizado
# Data: $(Get-Date -Format "dd/MM/yyyy")

Write-Host "=== Iniciando Aplicação Completa Endura ===" -ForegroundColor Cyan
Write-Host ""

# Verificar se os scripts existem
$backendScript = ".\start-backend.ps1"
$frontendScript = ".\start-frontend.ps1"

if (-not (Test-Path $backendScript)) {
    Write-Host "Aviso: Script do backend não encontrado ($backendScript)" -ForegroundColor Yellow
} else {
    Write-Host "Iniciando Backend..." -ForegroundColor Green
    & $backendScript
    Start-Sleep -Seconds 2
}

if (-not (Test-Path $frontendScript)) {
    Write-Host "Aviso: Script do frontend não encontrado ($frontendScript)" -ForegroundColor Yellow
} else {
    Write-Host "Iniciando Frontend..." -ForegroundColor Green
    & $frontendScript
    Start-Sleep -Seconds 2
}

Write-Host ""
Write-Host "=== Aplicação Endura Iniciada ===" -ForegroundColor Green
Write-Host "Backend:  http://localhost:8080/api" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "H2 Console: http://localhost:8080/h2-console" -ForegroundColor Yellow
Write-Host ""
Write-Host "Credenciais de teste:" -ForegroundColor Yellow
Write-Host "  Email: admin@endura.com | Senha: password" -ForegroundColor White
Write-Host "  Email: user@endura.com  | Senha: password" -ForegroundColor White
Write-Host ""
Write-Host "Para acessar a aplicação, abra: http://localhost:3000" -ForegroundColor Green