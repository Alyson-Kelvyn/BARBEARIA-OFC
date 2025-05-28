-- Habilitar a extensão uuid-ossp se ainda não estiver habilitada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Criar a tabela de barbeiros
CREATE TABLE IF NOT EXISTS barbers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    photo_url TEXT,
    specialties TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Limpar dados existentes (opcional)
TRUNCATE TABLE barbers;

-- Inserir barbeiros de exemplo
INSERT INTO barbers (name, photo_url, specialties) VALUES
('João Silva', 'https://example.com/joao.jpg', ARRAY['Corte Clássico', 'Barba']),
('Pedro Santos', 'https://example.com/pedro.jpg', ARRAY['Corte Moderno', 'Degradê']),
('Lucas Oliveira', 'https://example.com/lucas.jpg', ARRAY['Corte Afro', 'Tranças']),
('Rafael Costa', 'https://example.com/rafael.jpg', ARRAY['Corte Pompadour', 'Barba Desenhada']);

-- Verificar se os dados foram inseridos
SELECT * FROM barbers; 