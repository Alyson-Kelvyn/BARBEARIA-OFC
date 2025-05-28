/*
  # Add soft delete to appointments table

  1. Changes
    - Add deleted_at column to appointments table
    - Update RLS policies to exclude deleted records
    
  2. Security
    - Maintain existing RLS policies
    - Add filter for deleted records
*/

-- Add deleted_at column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'appointments' 
    AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE appointments ADD COLUMN deleted_at timestamptz DEFAULT NULL;
  END IF;
END $$;

-- Update policies to exclude deleted records
DO $$
BEGIN
  DROP POLICY IF EXISTS "Allow public read access to appointments" ON appointments;
  CREATE POLICY "Allow public read access to appointments" 
    ON appointments FOR SELECT 
    TO public 
    USING (deleted_at IS NULL);
EXCEPTION
  WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Allow authenticated read access to appointments" ON appointments;
  CREATE POLICY "Allow authenticated read access to appointments" 
    ON appointments FOR SELECT 
    TO authenticated 
    USING (deleted_at IS NULL);
EXCEPTION
  WHEN others THEN NULL;
END $$;