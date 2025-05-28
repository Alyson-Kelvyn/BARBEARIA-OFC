/*
  # Fix appointments table structure

  1. Changes
    - Drop and recreate appointments table with correct structure
    - Add proper constraints and defaults
    - Maintain existing RLS policies

  2. Security
    - Enable RLS
    - Add policies for public access
*/

-- Drop existing policies first
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Allow public read access to appointments" ON appointments;
  DROP POLICY IF EXISTS "Allow public insert to appointments" ON appointments;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Recreate appointments table with correct structure
DROP TABLE IF EXISTS appointments;
CREATE TABLE appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL,
  service_id uuid REFERENCES services(id),
  appointment_date timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  status text DEFAULT 'confirmed',
  UNIQUE(appointment_date)
);

-- Enable RLS
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Recreate policies
CREATE POLICY "Allow public read access to appointments" 
  ON appointments FOR SELECT 
  TO public 
  USING (true);

CREATE POLICY "Allow public insert to appointments" 
  ON appointments FOR INSERT 
  TO public 
  WITH CHECK (true);