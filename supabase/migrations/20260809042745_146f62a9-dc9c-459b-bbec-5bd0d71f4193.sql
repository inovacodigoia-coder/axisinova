ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS session_timeout integer DEFAULT 480;

-- Grant access to authenticated users
GRANT SELECT, UPDATE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
