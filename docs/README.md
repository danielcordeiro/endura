# Endura - Documentação Técnica

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Build](https://img.shields.io/badge/build-passing-brightgreen.svg)

Aplicativo de controle de treinos e suplementação esportiva com integração a plataformas de terceiros e recursos de inteligência artificial.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Stack Tecnológica](#stack-tecnológica)
- [Pré-requisitos](#pré-requisitos)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [API Reference](#api-reference)
- [Deploy](#deploy)
- [Fases do Projeto](#fases-do-projeto)
- [Contribuição](#contribuição)

## 🎯 Visão Geral

O **Endura** é uma plataforma completa para atletas e treinadores que permite:

- **Sincronização automática** com plataformas de treino (Strava, Garmin, TrainingPeaks)
- **Controle de suplementação** durante treinos e competições
- **Análise de performance** com insights baseados em IA
- **Gestão de atletas** para treinadores profissionais

## 🏗️ Arquitetura

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend       │    │   Database      │
│                 │    │                  │    │                 │
│  React 18       │◄──►│  Spring Boot     │◄──►│  PostgreSQL     │
│  TypeScript     │    │  Java 17+        │    │  (Supabase)     │
│  Vite           │    │  REST API        │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Integrations  │    │   AI Services    │    │   File Storage  │
│                 │    │                  │    │                 │
│  Strava API     │    │  OpenAI/Claude   │    │  Supabase       │
│  Garmin API     │    │  Image Analysis  │    │  Storage        │
│  TrainingPeaks  │    │  Text Processing │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🛠️ Stack Tecnológica

### Frontend
- **React 18** - Library principal para UI
- **TypeScript** - Tipagem estática
- **Vite** - Build tool e dev server
- **Tailwind CSS** - Framework CSS utilitário
- **React Router** - Roteamento SPA
- **Zustand** - Gerenciamento de estado
- **React Query** - Cache e sincronização de dados
- **React Hook Form** - Gerenciamento de formulários
- **Framer Motion** - Animações

### Backend
- **Spring Boot 3.x** - Framework principal
- **Java 17+** - Linguagem de programação
- **Spring Security** - Autenticação e autorização
- **Spring Data JPA** - Persistência de dados
- **Maven** - Gerenciamento de dependências
- **JWT** - Tokens de autenticação
- **OpenAPI 3** - Documentação da API

### Database & Infrastructure
- **PostgreSQL** - Banco de dados principal
- **Supabase** - Backend-as-a-Service
- **Docker** - Containerização
- **GitHub Actions** - CI/CD

### Integrações Externas
- **Strava API** - Sincronização de atividades
- **Garmin Connect API** - Dados de dispositivos Garmin
- **TrainingPeaks API** - Planos de treino
- **OpenAI API** - Análise de imagens e texto

## ✅ Pré-requisitos

### Desenvolvimento Local
- **Node.js** >= 18.0.0
- **Java** >= 17
- **Maven** >= 3.8.0
- **Docker** >= 20.0.0
- **Git** >= 2.30.0

### Contas/Serviços
- Conta no [Supabase](https://supabase.com)
- API Keys das plataformas de integração:
  - [Strava API](https://developers.strava.com)
  - [Garmin Developer](https://developer.garmin.com)
  - [TrainingPeaks API](https://www.trainingpeaks.com/developer)
- Conta OpenAI (para recursos de IA)

## 🚀 Instalação

### 1. Clone do Repositório
```bash
git clone https://github.com/danielcordeiro/endura.git
cd endura
```

### 2. Setup do Backend
```bash
cd backend
mvn clean install
```

### 3. Setup do Frontend
```bash
cd frontend
npm install
```

### 4. Docker (Opcional)
```bash
docker-compose up -d
```

## ⚙️ Configuração

### Backend - application.yml
```yaml
server:
  port: 8080

spring:
  datasource:
    url: ${SUPABASE_DATABASE_URL}
    username: ${SUPABASE_USERNAME}
    password: ${SUPABASE_PASSWORD}
  
  jpa:
    hibernate:
      ddl-auto: validate
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect

  security:
    jwt:
      secret: ${JWT_SECRET}
      expiration: 86400000

integrations:
  strava:
    client-id: ${STRAVA_CLIENT_ID}
    client-secret: ${STRAVA_CLIENT_SECRET}
  garmin:
    consumer-key: ${GARMIN_CONSUMER_KEY}
    consumer-secret: ${GARMIN_CONSUMER_SECRET}
  openai:
    api-key: ${OPENAI_API_KEY}
```

### Frontend - .env
```bash
VITE_API_BASE_URL=http://localhost:8080/api
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 📁 Estrutura do Projeto

```
endura/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/           # Componentes base
│   │   │   ├── forms/        # Formulários
│   │   │   └── charts/       # Gráficos e visualização
│   │   ├── pages/
│   │   │   ├── auth/         # Login/Registro
│   │   │   ├── dashboard/    # Dashboard principal
│   │   │   ├── workouts/     # Gestão de treinos
│   │   │   └── supplements/  # Controle de suplementação
│   │   ├── hooks/            # Custom hooks
│   │   ├── services/         # API calls
│   │   ├── stores/           # Zustand stores
│   │   ├── types/            # TypeScript types
│   │   └── utils/            # Funções utilitárias
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
├── backend/
│   ├── src/main/java/com/endura/
│   │   ├── config/           # Configurações
│   │   ├── controller/       # REST Controllers
│   │   ├── service/          # Lógica de negócio
│   │   ├── repository/       # Data Access Layer
│   │   ├── model/            # Entidades JPA
│   │   ├── dto/              # Data Transfer Objects
│   │   └── integration/      # APIs externas
│   ├── src/main/resources/
│   │   ├── application.yml
│   │   └── db/migration/     # Flyway migrations
│   └── pom.xml
├── docs/                     # Documentação
├── docker-compose.yml
└── README.md
```

## 🔌 API Reference

### Autenticação
```http
POST /api/auth/login
POST /api/auth/register
POST /api/auth/refresh
```

### Usuários
```http
GET    /api/users/profile
PUT    /api/users/profile
DELETE /api/users/profile
```

### Treinos
```http
GET    /api/workouts
POST   /api/workouts
GET    /api/workouts/{id}
PUT    /api/workouts/{id}
DELETE /api/workouts/{id}
POST   /api/workouts/sync  # Sincronização com APIs externas
```

### Suplementação
```http
GET    /api/supplements
POST   /api/supplements
GET    /api/supplements/{id}
PUT    /api/supplements/{id}
DELETE /api/supplements/{id}
POST   /api/supplements/analyze-image  # IA para análise de fotos
```

### Relatórios
```http
GET /api/reports/performance
GET /api/reports/supplements
GET /api/reports/insights
```

## 🚀 Deploy

### Desenvolvimento
```bash
# Frontend
cd frontend && npm run dev

# Backend
cd backend && mvn spring-boot:run
```

### Produção
```bash
# Build Frontend
cd frontend && npm run build

# Build Backend
cd backend && mvn clean package

# Docker Deploy
docker-compose -f docker-compose.prod.yml up -d
```

## � Fases do Projeto

### �📌 Fase 1 - MVP
Funcionalidades iniciais: sincronização com Strava (ou outra plataforma escolhida) e lançamento manual de suplementação.

- [Regras de Negócio (Fase 1)](regras_negocio.md)
- [Integração (Fase 1)](integracao.md)
- [Layout, Campos e Frontend (Fase 1)](layout_frontend.md)

### 🤖 Fase 2 - Versão com IA
Adição de inteligência artificial para leitura de fotos/textos de suplementos e geração de insights sobre performance.

- [Regras de Negócio (Fase 2)](regras_negocio_fase2.md)
- [Integração (Fase 2)](integracao_fase2.md)
- [Layout, Campos e Frontend (Fase 2)](layout_frontend_fase2.md)

### 🎓 Fase 3 - Versão Treinador
Funcionalidade para que treinadores visualizem dados dos alunos, insights e deixem comentários.

- [Regras de Negócio (Fase 3)](regras_negocio_fase3.md)
- [Integração (Fase 3)](integracao_fase3.md)
- [Layout, Campos e Frontend (Fase 3)](layout_frontend_fase3.md)

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

### Padrões de Código

- **Frontend**: ESLint + Prettier
- **Backend**: Google Java Style Guide
- **Commits**: Conventional Commits
- **Branches**: GitFlow

## � Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 📞 Suporte

- 📧 Email: danielcordeiro@endura.app
- 🐛 Issues: [GitHub Issues](https://github.com/danielcordeiro/endura/issues)
- 📖 Wiki: [Project Wiki](https://github.com/danielcordeiro/endura/wiki)

---

⭐ **Se este projeto te ajudou, considere dar uma estrela!**

