# Endura Frontend

Frontend do aplicativo Endura desenvolvido com React 18, TypeScript e Vite.

## 🛠️ Tecnologias

- **React 18** - Library principal para UI
- **TypeScript** - Tipagem estática
- **Vite** - Build tool e dev server
- **Tailwind CSS** - Framework CSS utilitário
- **React Router** - Roteamento SPA
- **Zustand** - Gerenciamento de estado
- **React Query** - Cache e sincronização de dados
- **React Hook Form** - Gerenciamento de formulários

## 📋 Pré-requisitos

- Node.js 18 ou superior
- npm ou yarn

## 🚀 Instalação e Execução

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar ambiente
Copie o arquivo de exemplo e configure as variáveis:
```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:
```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:8080/api

# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# External APIs
VITE_STRAVA_CLIENT_ID=your_strava_client_id
VITE_GARMIN_CONSUMER_KEY=your_garmin_consumer_key
```

### 3. Executar em desenvolvimento
```bash
npm run dev
```

O frontend estará disponível em: http://localhost:3000

### 4. Build para produção
```bash
npm run build
```

### 5. Preview do build
```bash
npm run preview
```

## 🧪 Testes

### Executar testes
```bash
npm run test
```

### Executar testes com interface
```bash
npm run test:ui
```

### Executar com coverage
```bash
npm run test:coverage
```

## 🔧 Scripts Disponíveis

- `npm run dev` - Inicia o servidor de desenvolvimento
- `npm run build` - Gera build de produção
- `npm run preview` - Preview do build de produção
- `npm run test` - Executa testes
- `npm run test:ui` - Interface de testes
- `npm run test:coverage` - Testes com coverage
- `npm run lint` - Verifica código com ESLint
- `npm run lint:fix` - Corrige problemas do ESLint
- `npm run format` - Formata código com Prettier
- `npm run type-check` - Verifica tipos TypeScript

## 📁 Estrutura do Projeto

```
src/
├── components/
│   ├── ui/           # Componentes base (Button, Input, etc.)
│   ├── forms/        # Formulários específicos
│   └── charts/       # Componentes de gráficos
├── pages/
│   ├── auth/         # Páginas de autenticação
│   ├── dashboard/    # Dashboard principal
│   ├── workouts/     # Páginas de treinos
│   └── supplements/  # Páginas de suplementação
├── hooks/            # Custom hooks
├── services/         # Chamadas para API
├── stores/           # Stores do Zustand
├── types/            # Tipos TypeScript
└── utils/            # Funções utilitárias
```

## 🐳 Docker

### Executar com Docker
```bash
# Build da imagem
docker build -t endura-frontend .

# Executar container
docker run -p 3000:80 endura-frontend
```

### Docker Compose (na raiz do projeto)
```bash
docker-compose up frontend
```

## 🔗 Integração com Backend

O frontend se comunica com o backend através da API REST em `http://localhost:8080/api`.

Certifique-se de que o backend esteja rodando antes de iniciar o frontend.

## 🚨 Troubleshooting

### Problemas comuns:

1. **Erro de CORS**: Verifique se o backend está configurado para aceitar requisições do frontend
2. **Variáveis de ambiente**: Certifique-se de que o arquivo `.env` está configurado corretamente
3. **Dependências**: Execute `npm install` se houver problemas com packages

### Logs úteis:
```bash
# Executar com logs detalhados
npm run dev -- --debug

# Verificar tipos TypeScript
npm run type-check
```

## 📚 Recursos Adicionais

- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vitejs.dev/guide/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [React Query](https://tanstack.com/query/latest/docs/react/overview)