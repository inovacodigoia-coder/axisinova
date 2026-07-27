-- Create establishments table
CREATE TABLE public.establishments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    cnpj TEXT,
    city TEXT,
    is_main_branch BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create origins table
CREATE TABLE public.origins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    internal_code TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_origin_preferences table
CREATE TABLE public.user_origin_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    origin_id UUID REFERENCES public.origins(id) ON DELETE CASCADE NOT NULL,
    is_favorite BOOLEAN DEFAULT false,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, company_id, origin_id)
);

-- RLS and Grants
ALTER TABLE public.establishments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.origins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_origin_preferences ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.establishments TO authenticated;
GRANT ALL ON public.establishments TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.origins TO authenticated;
GRANT ALL ON public.origins TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_origin_preferences TO authenticated;
GRANT ALL ON public.user_origin_preferences TO service_role;

-- Basic policies (assuming company_id scoping)
CREATE POLICY "Users can see their company establishments" ON public.establishments
    FOR SELECT TO authenticated USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can see their company origins" ON public.origins
    FOR SELECT TO authenticated USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage their origin preferences" ON public.user_origin_preferences
    FOR ALL TO authenticated USING (user_id = auth.uid());
