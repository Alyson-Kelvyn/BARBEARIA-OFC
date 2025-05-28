-- Adicionar a coluna barber_id na tabela appointments
ALTER TABLE appointments 
ADD COLUMN barber_id UUID REFERENCES barbers(id);

-- Criar uma política para permitir inserção com barber_id
CREATE POLICY "Permitir inserção de agendamentos com barbeiro"
ON appointments
FOR INSERT
TO public
WITH CHECK (true);

-- Criar uma política para permitir leitura de agendamentos
CREATE POLICY "Permitir leitura de agendamentos"
ON appointments
FOR SELECT
TO public
USING (true); 