/*
  # Fix appointments table structure

  1. Changes
    - Rename date_time column to appointment_date
    - Add status column with default value

  2. Security
    - Maintain existing RLS policies
*/

DO $$ 
BEGIN
  -- Rename date_time to appointment_date if it exists
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'appointments' 
    AND column_name = 'date_time'
  ) THEN
    ALTER TABLE appointments RENAME COLUMN date_time TO appointment_date;
  END IF;

  -- Add status column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'appointments' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE appointments ADD COLUMN status text DEFAULT 'confirmed';
  END IF;
END $$;