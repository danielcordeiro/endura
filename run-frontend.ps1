# Script para inicializar o frontend do Endura
# Autor: Sistema automatizado
# Data: $(Get-Date -Format "dd/MM/yyyy")

Write-Host "=== Iniciando Frontend Endura ===" -ForegroundColor Cyan
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

# Verificar se package.json existe
if (-not (Test-Path "package.json")) {
    Write-Host "Erro: package.json não encontrado no diretório frontend!" -ForegroundColor Red
    exit 1
}

# Verificar se node_modules existe, se não, instalar dependências
if (-not (Test-Path "node_modules")) {
    Write-Host "Dependências não encontradas. Instalando..." -ForegroundColor Yellow
    Write-Host ""
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Erro ao instalar dependências!" -ForegroundColor Red
        exit 1
    }
    Write-Host ""
    Write-Host "Dependências instaladas com sucesso!" -ForegroundColor Green
} else {
    Write-Host "Dependências encontradas ✓" -ForegroundColor Green
}

Write-Host ""
Write-Host "Verificando se há atualizações de dependências..." -ForegroundColor Yellow
npm outdated --depth=0

Write-Host ""
Write-Host "=== Iniciando servidor de desenvolvimento ===" -ForegroundColor Cyan
Write-Host "O frontend estará disponível em: http://localhost:3000" -ForegroundColor Green
Write-Host "Pressione Ctrl+C para parar o servidor" -ForegroundColor Yellow
Write-Host ""

# Iniciar o servidor de desenvolvimento
npm run dev