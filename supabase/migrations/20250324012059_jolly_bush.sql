/*
  # Add phone number to appointments table

  1. Changes
    - Add phone_number column to appointments table
    
  2. Security
    - Maintain existing RLS policies
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'appointments' 
    AND column_name = 'phone_number'
  ) THEN
    ALTER TABLE appointments ADD COLUMN phone_number text NOT NULL DEFAULT '';
  END IF;
END $$;