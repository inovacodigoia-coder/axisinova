
-- Queue Units
CREATE TABLE public.queue_units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.queue_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "queue_units_select" ON public.queue_units FOR SELECT TO authenticated USING (true);
CREATE POLICY "queue_units_insert" ON public.queue_units FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "queue_units_update" ON public.queue_units FOR UPDATE TO authenticated USING (true);
CREATE POLICY "queue_units_delete" ON public.queue_units FOR DELETE TO authenticated USING (true);

-- Queue Totems
CREATE TABLE public.queue_totems (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.queue_units(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.queue_totems ENABLE ROW LEVEL SECURITY;
CREATE POLICY "queue_totems_select" ON public.queue_totems FOR SELECT TO authenticated USING (true);
CREATE POLICY "queue_totems_insert" ON public.queue_totems FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "queue_totems_update" ON public.queue_totems FOR UPDATE TO authenticated USING (true);
CREATE POLICY "queue_totems_delete" ON public.queue_totems FOR DELETE TO authenticated USING (true);

-- Queue Lines
CREATE TABLE public.queue_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.queue_units(id) ON DELETE CASCADE,
  totem_id UUID REFERENCES public.queue_totems(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  prefix TEXT NOT NULL,
  prefix_alt TEXT,
  type TEXT NOT NULL DEFAULT 'external',
  category TEXT NOT NULL DEFAULT 'attendance',
  color TEXT DEFAULT '#e0e0e0',
  show_on_totem BOOLEAN NOT NULL DEFAULT true,
  queue_type TEXT NOT NULL DEFAULT 'single',
  linked_queue_ids TEXT[] NOT NULL DEFAULT '{}',
  has_preferential BOOLEAN NOT NULL DEFAULT false,
  has_preferential_80 BOOLEAN NOT NULL DEFAULT false,
  allow_totem_choice BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.queue_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "queue_lines_select" ON public.queue_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "queue_lines_insert" ON public.queue_lines FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "queue_lines_update" ON public.queue_lines FOR UPDATE TO authenticated USING (true);
CREATE POLICY "queue_lines_delete" ON public.queue_lines FOR DELETE TO authenticated USING (true);

-- Queue Guiches
CREATE TABLE public.queue_guiches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.queue_units(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'external',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.queue_guiches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "queue_guiches_select" ON public.queue_guiches FOR SELECT TO authenticated USING (true);
CREATE POLICY "queue_guiches_insert" ON public.queue_guiches FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "queue_guiches_update" ON public.queue_guiches FOR UPDATE TO authenticated USING (true);
CREATE POLICY "queue_guiches_delete" ON public.queue_guiches FOR DELETE TO authenticated USING (true);

-- Queue TVs
CREATE TABLE public.queue_tvs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.queue_units(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  voice_type TEXT NOT NULL DEFAULT 'feminine',
  screen_size TEXT NOT NULL DEFAULT 'medium',
  device_count INTEGER NOT NULL DEFAULT 1,
  media_mode TEXT NOT NULL DEFAULT 'without_media',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.queue_tvs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "queue_tvs_select" ON public.queue_tvs FOR SELECT TO authenticated USING (true);
CREATE POLICY "queue_tvs_insert" ON public.queue_tvs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "queue_tvs_update" ON public.queue_tvs FOR UPDATE TO authenticated USING (true);
CREATE POLICY "queue_tvs_delete" ON public.queue_tvs FOR DELETE TO authenticated USING (true);
