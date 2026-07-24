-- 1. Add sequential ID to patients table
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS sequence_id SERIAL;

-- 2. Update existing protocols in orders (simulated via mock data for now, but we need the column in the DB)
-- Note: Since we are using mock orders in the frontend, we mainly need the patient sequence.

-- 3. Grants
GRANT SELECT, UPDATE ON public.patients TO authenticated;
GRANT ALL ON public.patients TO service_role;
