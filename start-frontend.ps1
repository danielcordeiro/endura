# Script para inicializar o frontend em uma nova janela do PowerShell
# Autor: Sistema automatizado
# Data: $(Get-Date -Format "dd/MM/yyyy")

Write-Host "=== Abrindo Frontend Endura em Nova Janela ===" -ForegroundColor Cyan

$frontendPath = "C:\Users\danie\git\dgc\endura\frontend"

if (-not (Test-Path $frontendPath)) {
    Write-Host "Erro: Diretório frontend não encontrado em $frontendPath!" -ForegroundColor Red
    exit 1
}

# Abrir nova janela do PowerShell e iniciar o frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$frontendPath'; Write-Host 'Frontend Endura - Servidor de Desenvolvimento' -ForegroundColor Cyan; Write-Host 'Diretório: $frontendPath' -ForegroundColor Green; Write-Host ''; if (-not (Test-Path 'node_modules')) { Write-Host 'Instalando dependências...' -ForegroundColor Yellow; npm install }; Write-Host 'Iniciando servidor...'; npm run dev"

Write-Host "Nova janela do PowerShell aberta para o frontend!" -ForegroundColor Green
Write-Host "O servidor estará disponível em: http://localhost:3000" -ForegroundColor Yellow