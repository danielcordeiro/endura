# Script para instalar/atualizar dependências do frontend
# Autor: Sistema automatizado
# Data: $(Get-Date -Format "dd/MM/yyyy")

Write-Host "=== Setup Frontend Endura ===" -ForegroundColor Cyan
Write-Host ""

# Navegar para o diretório do frontend
$frontendPath = ".\frontend"
if (-not (Test-Path $frontendPath)) {
    Write-Host "Erro: Diretório frontend não encontrado!" -ForegroundColor Red
    Write-Host "Certifique-se de estar na raiz do projeto Endura." -ForegroundColor Red
    exit 1
}

Write-Host "Navegando para o diretório frontend..." -ForegroundColor Yellow
Set-Location $frontendPath

# Verificar versão do Node.js
Write-Host "Verificando versão do Node.js..." -ForegroundColor Yellow
node --version
if ($LASTEXITCODE -ne 0) {
    Write-Host "Erro: Node.js não encontrado! Instale o Node.js antes de continuar." -ForegroundColor Red
    exit 1
}

# Verificar versão do npm
Write-Host "Verificando versão do npm..." -ForegroundColor Yellow
npm --version

Write-Host ""
Write-Host "Limpando cache do npm..." -ForegroundColor Yellow
npm cache clean --force

Write-Host ""
Write-Host "Removendo node_modules existente..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Remove-Item -Recurse -Force "node_modules"
    Write-Host "node_modules removido ✓" -ForegroundColor Green
}

Write-Host ""
Write-Host "Removendo package-lock.json..." -ForegroundColor Yellow
if (Test-Path "package-lock.json") {
    Remove-Item "package-lock.json"
    Write-Host "package-lock.json removido ✓" -ForegroundColor Green
}

Write-Host ""
Write-Host "Instalando dependências..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=== Setup concluído com sucesso! ===" -ForegroundColor Green
    Write-Host "Você pode agora executar:" -ForegroundColor Cyan
    Write-Host "  .\run-frontend.ps1       - Para iniciar o servidor de desenvolvimento" -ForegroundColor White
    Write-Host "  .\start-frontend.ps1     - Para abrir em nova janela" -ForegroundColor White
    Write-Host "  npm run dev              - Para iniciar manualmente" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "Erro durante a instalação das dependências!" -ForegroundColor Red
    exit 1
}