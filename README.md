# Endura Project

## Quick Start

### Prerequisites
- Node.js 18+
- Java 17+
- Docker & Docker Compose
- PostgreSQL (or use Docker)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/danielcordeiro/endura.git
   cd endura
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   cp frontend/.env.example frontend/.env
   # Edit the .env files with your configuration
   ```

3. **Run with Docker (Recommended)**
   ```bash
   docker-compose up -d
   ```

4. **Or run manually**
   ```bash
   # Backend
   cd backend
   mvn spring-boot:run
   
   # Frontend (new terminal)
   cd frontend
   npm install
   npm run dev
   ```

### Access the Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:8080/api
- API Documentation: http://localhost:8080/swagger-ui/index.html

### Project Structure
```
endura/
├── frontend/          # React 18 + TypeScript + Vite
├── backend/           # Spring Boot + Java 17
├── docs/              # Project documentation
├── docker-compose.yml # Development environment
└── README.md
```

For detailed documentation, see [docs/README.md](docs/README.md)