ALTER TABLE public.profiles ADD COLUMN badge_code text;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_badge_code_unique UNIQUE (badge_code);

GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
