# Script para diagnosticar e resolver problemas do backend Endura
Write-Host "=== DIAGNÓSTICO BACKEND ENDURA ===" -ForegroundColor Cyan

# Verificar se PostgreSQL está rodando
Write-Host "1. Verificando se PostgreSQL está rodando..." -ForegroundColor Yellow
$pgProcess = Get-Process -Name "postgres" -ErrorAction SilentlyContinue
if ($pgProcess) {
    Write-Host "✅ PostgreSQL está rodando" -ForegroundColor Green
} else {
    Write-Host "❌ PostgreSQL não está rodando" -ForegroundColor Red
    Write-Host "Para instalar PostgreSQL:" -ForegroundColor Yellow
    Write-Host "  - Download: https://www.postgresql.org/download/windows/" -ForegroundColor Cyan
    Write-Host "  - Ou use Docker: docker run --name postgres -e POSTGRES_PASSWORD=123456 -p 5432:5432 -d postgres" -ForegroundColor Cyan
}

# Verificar conectividade com banco
Write-Host "`n2. Testando conectividade com banco de dados..." -ForegroundColor Yellow
try {
    $testConnection = Test-NetConnection -ComputerName localhost -Port 5432 -WarningAction SilentlyContinue
    if ($testConnection.TcpTestSucceeded) {
        Write-Host "✅ Porta 5432 está acessível" -ForegroundColor Green
    } else {
        Write-Host "❌ Porta 5432 não está acessível" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Erro ao testar conectividade: $($_.Exception.Message)" -ForegroundColor Red
}

# Verificar se o banco 'endura' existe
Write-Host "`n3. Comandos para criar banco de dados:" -ForegroundColor Yellow
Write-Host "psql -U postgres -c `"CREATE DATABASE endura;`"" -ForegroundColor Cyan

Write-Host "`n4. Configuração alternativa (H2 Database para testes):" -ForegroundColor Yellow
Write-Host "Se não tiver PostgreSQL, posso configurar H2 database temporariamente" -ForegroundColor Cyan

Write-Host "`n=== PRÓXIMOS PASSOS ===" -ForegroundColor Magenta
Write-Host "1. Instale/inicie PostgreSQL" -ForegroundColor White
Write-Host "2. Crie o banco 'endura'" -ForegroundColor White
Write-Host "3. Execute novamente .\run-backend.ps1" -ForegroundColor White