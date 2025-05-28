/*
  # Create appointments and services tables

  1. New Tables
    - `services`
      - `id` (uuid, primary key)
      - `name` (text)
      - `duration` (integer, minutes)
      - `price` (decimal)
    - `appointments`
      - `id` (uuid, primary key)
      - `client_name` (text)
      - `service_id` (uuid, foreign key)
      - `date_time` (timestamptz)
      - `created_at` (timestamptz)
      
  2. Security
    - Enable RLS on both tables
    - Add policies for reading and creating appointments
*/

-- Create services table if it doesn't exist
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  duration integer NOT NULL,
  price decimal(10,2) NOT NULL
);

-- Create appointments table if it doesn't exist
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL,
  service_id uuid REFERENCES services(id),
  date_time timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(date_time)
);

-- Enable RLS safely using DO blocks
DO $$
BEGIN
  ALTER TABLE services ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Create policies safely
DO $$
BEGIN
  CREATE POLICY "Allow public read access to services" 
    ON services FOR SELECT 
    TO public 
    USING (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Allow public read access to appointments" 
    ON appointments FOR SELECT 
    TO public 
    USING (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Allow public insert to appointments" 
    ON appointments FOR INSERT 
    TO public 
    WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Insert initial services if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM services LIMIT 1) THEN
    INSERT INTO services (name, duration, price) VALUES
      ('Corte de Cabelo', 30, 35.00),
      ('Barba', 20, 25.00),
      ('Corte + Barba', 50, 55.00);
  END IF;
END $$;