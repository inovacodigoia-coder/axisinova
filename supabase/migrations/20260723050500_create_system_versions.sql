CREATE TABLE public.system_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    major INTEGER NOT NULL DEFAULT 1,
    minor INTEGER NOT NULL DEFAULT 0,
    patch INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

GRANT SELECT, INSERT, UPDATE ON public.system_versions TO authenticated;
GRANT ALL ON public.system_versions TO service_role;
GRANT SELECT ON public.system_versions TO anon;

ALTER TABLE public.system_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON public.system_versions FOR SELECT USING (true);

-- Seed initial version
INSERT INTO public.system_versions (major, minor, patch) VALUES (1, 0, 0);
