# Script para inicializar o backend do projeto Endura
# Configura o Java 17 e inicia o Spring Boot

Write-Host "=== INICIALIZANDO BACKEND ENDURA ===" -ForegroundColor Cyan

# Configurar Java 17
$javaHome = "C:\Program Files\Java\jdk-17"
if (Test-Path $javaHome) {
    $env:JAVA_HOME = $javaHome
    $env:PATH = "$javaHome\bin;" + $env:PATH
    Write-Host "Java 17 configurado: $javaHome" -ForegroundColor Green
} else {
    Write-Host "Java 17 não encontrado em: $javaHome" -ForegroundColor Red
    exit 1
}

# Verificar versão do Java
Write-Host "Versão do Java:" -ForegroundColor Yellow
java -version

# Navegar para o diretório backend
$backendPath = "C:\Users\danie\git\dgc\endura\backend"
if (Test-Path $backendPath) {
    Set-Location $backendPath
    Write-Host "Navegado para: $backendPath" -ForegroundColor Green
} else {
    Write-Host "Diretório backend não encontrado: $backendPath" -ForegroundColor Red
    exit 1
}

# Verificar se há processos na porta 8080
$processes = netstat -ano | Select-String ":8080"
if ($processes) {
    Write-Host "Processos encontrados na porta 8080:" -ForegroundColor Yellow
    $processes | ForEach-Object { Write-Host $_ }
    
    # Extrair PID e tentar finalizar
    $processes | ForEach-Object {
        $parts = $_.ToString().Split() | Where-Object { $_ -ne "" }
        $pid = $parts[-1]
        if ($pid -match '^\d+$') {
            Write-Host "Finalizando processo PID: $pid" -ForegroundColor Red
            try {
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                Write-Host "Processo $pid finalizado" -ForegroundColor Green
            } catch {
                Write-Host "Erro ao finalizar processo $pid" -ForegroundColor Red
            }
        }
    }
    Start-Sleep -Seconds 2
}

Write-Host "" 
Write-Host "=== INICIANDO SPRING BOOT ===" -ForegroundColor Cyan
Write-Host "Backend iniciando em: http://localhost:8080" -ForegroundColor Green
Write-Host "H2 Console disponível em: http://localhost:8080/h2-console" -ForegroundColor Green
Write-Host "- JDBC URL: jdbc:h2:mem:endura" -ForegroundColor Yellow
Write-Host "- User: sa" -ForegroundColor Yellow
Write-Host "- Password: (vazio)" -ForegroundColor Yellow
Write-Host "Aguarde a inicialização..." -ForegroundColor Blue

# Iniciar Spring Boot
mvn spring-boot:run