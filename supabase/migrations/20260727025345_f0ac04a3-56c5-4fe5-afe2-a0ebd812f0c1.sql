ALTER TABLE public.establishments ADD COLUMN IF NOT EXISTS internal_code TEXT;

-- Update existing "MATRIZ" establishments to have code "00" if not already set
UPDATE public.establishments 
SET internal_code = '00' 
WHERE (is_main_branch = true OR name ILIKE '%MATRIZ%') 
AND internal_code IS NULL;
