-- Remover a tabela appointments se ela existir
DROP TABLE IF EXISTS appointments;

-- Criar a tabela appointments com todas as colunas necessárias
CREATE TABLE appointments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_name TEXT NOT NULL,
    client_phone TEXT NOT NULL,
    service_id UUID REFERENCES services(id),
    barber_id UUID REFERENCES barbers(id),
    appointment_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    status TEXT DEFAULT 'pending'
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Criar políticas de segurança
CREATE POLICY "Permitir inserção de agendamentos"
ON appointments
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Permitir leitura de agendamentos"
ON appointments
FOR SELECT
TO public
USING (true);

CREATE POLICY "Permitir atualização de agendamentos"
ON appointments
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Permitir exclusão de agendamentos"
ON appointments
FOR DELETE
TO public
USING (true); 