# Scripts de Inicialização - Endura

Este diretório contém scripts PowerShell para facilitar o desenvolvimento da aplicação Endura.

## Scripts Disponíveis

### Frontend
- **`run-frontend.ps1`** - Inicia o servidor de desenvolvimento do frontend na mesma janela
- **`start-frontend.ps1`** - Abre uma nova janela do PowerShell e inicia o frontend
- **`setup-frontend.ps1`** - Configura o ambiente frontend (limpa cache, reinstala dependências)

### Backend
- **`run-backend.ps1`** - Inicia o servidor backend na mesma janela
- **`start-backend.ps1`** - Abre uma nova janela do PowerShell e inicia o backend
- **`setup-env.ps1`** - Configura as variáveis de ambiente para Java 17

### Aplicação Completa
- **`start-app.ps1`** - Inicia tanto frontend quanto backend em janelas separadas

## Como Usar

### Primeira vez (Setup inicial)
```powershell
# Configure o ambiente backend (Java 17)
.\setup-env.ps1

# Configure o ambiente frontend (instala dependências)
.\setup-frontend.ps1
```

### Uso diário

#### Opção 1: Iniciar tudo de uma vez
```powershell
.\start-app.ps1
```

#### Opção 2: Iniciar individualmente
```powershell
# Apenas o backend
.\start-backend.ps1

# Apenas o frontend
.\start-frontend.ps1
```

#### Opção 3: Na mesma janela (para debugging)
```powershell
# Backend na mesma janela
.\run-backend.ps1

# Frontend na mesma janela (em outro terminal)
.\run-frontend.ps1
```

## URLs da Aplicação

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080/api
- **H2 Database Console**: http://localhost:8080/h2-console

## Credenciais de Teste

- **Admin**: admin@endura.com / password
- **User**: user@endura.com / password

## Estrutura da Aplicação

```
endura/
├── backend/           # Spring Boot API
├── frontend/          # React + Vite
├── docs/             # Documentação
└── *.ps1             # Scripts de inicialização
```

## Resolução de Problemas

### Frontend não inicia
1. Execute `.\setup-frontend.ps1` para reinstalar dependências
2. Verifique se o Node.js está instalado: `node --version`
3. Verifique se está na raiz do projeto

### Backend não inicia
1. Execute `.\setup-env.ps1` para configurar Java 17
2. Verifique se o Java 17 está instalado: `java -version`
3. Verifique se o Maven está disponível: `mvn -version`

### Portas ocupadas
- Frontend (3000): Mude a porta no `package.json` ou mate o processo
- Backend (8080): Mude em `application.yml` ou mate o processo Java

## Notas Importantes

- Os scripts assumem que você está na raiz do projeto Endura
- É necessário ter PowerShell com permissões de execução
- Java 17 e Node.js são pré-requisitos
- A aplicação usa H2 database em memória para desenvolvimento