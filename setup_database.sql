-- Habilitar a extensão uuid-ossp
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Criar a tabela de barbeiros
DROP TABLE IF EXISTS barbers CASCADE;
CREATE TABLE barbers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    photo_url TEXT,
    specialties TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Criar a tabela de serviços
DROP TABLE IF EXISTS services CASCADE;
CREATE TABLE services (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    duration INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Criar a tabela de agendamentos
DROP TABLE IF EXISTS appointments CASCADE;
CREATE TABLE appointments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_name TEXT NOT NULL,
    client_phone TEXT NOT NULL,
    service_id UUID REFERENCES services(id),
    barber_id UUID REFERENCES barbers(id),
    appointment_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    status TEXT DEFAULT 'pending',
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Desabilitar RLS temporariamente
ALTER TABLE barbers DISABLE ROW LEVEL SECURITY;
ALTER TABLE services DISABLE ROW LEVEL SECURITY;
ALTER TABLE appointments DISABLE ROW LEVEL SECURITY;

-- Inserir barbeiros de exemplo
INSERT INTO barbers (name, photo_url, specialties) VALUES
('João Silva', 'https://example.com/joao.jpg', ARRAY['Corte Clássico', 'Barba']),
('Pedro Santos', 'https://example.com/pedro.jpg', ARRAY['Corte Moderno', 'Degradê']),
('Lucas Oliveira', 'https://example.com/lucas.jpg', ARRAY['Corte Afro', 'Tranças']),
('Rafael Costa', 'https://example.com/rafael.jpg', ARRAY['Corte Pompadour', 'Barba Desenhada']);

-- Inserir serviços de exemplo
INSERT INTO services (name, duration, price) VALUES
('Corte de Cabelo', 30, 30.00),
('Barba', 20, 20.00),
('Corte + Barba', 45, 45.00),
('Degradê', 40, 35.00);

-- Habilitar RLS
ALTER TABLE barbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Criar políticas simples para acesso público
CREATE POLICY "Acesso público aos barbeiros"
ON barbers FOR ALL
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Acesso público aos serviços"
ON services FOR ALL
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Acesso público aos agendamentos"
ON appointments FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Verificar se os dados foram inseridos
SELECT 'Barbeiros:' as tabela;
SELECT * FROM barbers;
SELECT 'Serviços:' as tabela;
SELECT * FROM services; 