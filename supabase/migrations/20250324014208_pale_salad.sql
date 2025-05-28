/*
  # Add admin user and RLS policies

  1. Changes
    - Create admin user
    - Update RLS policies for appointments table
    - Add status column to appointments if not exists

  2. Security
    - Enable RLS
    - Add policies for admin access
*/

-- Add status column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'appointments' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE appointments ADD COLUMN status text DEFAULT 'confirmed';
  END IF;
END $$;

-- Update RLS policies for appointments
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow public read access to appointments" ON appointments;
DROP POLICY IF EXISTS "Allow public insert to appointments" ON appointments;

-- Create new policies
CREATE POLICY "Allow public insert to appointments"
ON appointments FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Allow authenticated read access to appointments"
ON appointments FOR SELECT
TO authenticated
USING (true);

-- Note: You'll need to create the admin user through the Supabase dashboard
-- with the following email and password:
-- Email: admin@barbearia.com
-- Password: (set a secure password through the dashboard)