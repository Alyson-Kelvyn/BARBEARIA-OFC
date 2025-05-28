/*
  # Fix appointment date constraints

  1. Changes
    - Remove unique constraint from appointment_date
    - Add proper index for appointment dates

  2. Security
    - No security changes
*/

-- Drop the unique constraint
ALTER TABLE appointments 
DROP CONSTRAINT IF EXISTS appointments_appointment_date_key;

-- Drop the index if it exists
DROP INDEX IF EXISTS appointments_appointment_date_key;

-- Create a new index for appointment dates (non-unique)
CREATE INDEX IF NOT EXISTS idx_appointments_date 
ON appointments (appointment_date);