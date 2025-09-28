-- Dados iniciais para desenvolvimento com H2 Database
-- Este arquivo é executado automaticamente quando a aplicação inicia

-- Criar usuário de teste (senha: password)
INSERT INTO users (id, email, password, first_name, last_name, created_at, updated_at, is_active) 
VALUES (1, 'admin@endura.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'Admin', 'User', NOW(), NOW(), true);

-- Criar usuário de teste (senha: password)
INSERT INTO users (id, email, password, first_name, last_name, created_at, updated_at, is_active) 
VALUES (2, 'user@endura.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'Test', 'User', NOW(), NOW(), true);