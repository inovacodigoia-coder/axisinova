-- Create attendance_origins table
CREATE TABLE IF NOT EXISTS public.attendance_origins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(company_id, code)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_origins TO authenticated;
GRANT ALL ON public.attendance_origins TO service_role;
GRANT SELECT ON public.attendance_origins TO anon;

ALTER TABLE public.attendance_origins ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'attendance_origins' AND policyname = 'Users can manage their company origins') THEN
        CREATE POLICY "Users can manage their company origins"
            ON public.attendance_origins FOR ALL
            TO authenticated
            USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
    END IF;
END $$;

-- Create attendance_orders table
CREATE TABLE IF NOT EXISTS public.attendance_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    origin_id UUID REFERENCES public.attendance_origins(id) ON DELETE SET NULL,
    patient_name TEXT,
    origin_code TEXT,
    origin_name TEXT,
    order_number TEXT NOT NULL,
    protocol TEXT NOT NULL,
    hash TEXT,
    service_type TEXT NOT NULL CHECK (service_type IN ('consultation', 'exam', 'procedure')),
    payment_type TEXT NOT NULL CHECK (payment_type IN ('convenio', 'private', 'free')),
    exam_mode TEXT CHECK (exam_mode IN ('clinic', 'lab')),
    status TEXT NOT NULL DEFAULT 'open',
    doctor_id UUID REFERENCES public.doctors(id) ON DELETE SET NULL,
    doctor_name TEXT,
    doctor_crm TEXT,
    specialty TEXT,
    requesting_doctor TEXT,
    convenio_id UUID REFERENCES public.convenios(id) ON DELETE SET NULL,
    convenio_name TEXT,
    card_number TEXT,
    card_expiry TEXT,
    authorization_code TEXT,
    authorization_date TEXT,
    authorization_expiry TEXT,
    authorization_password TEXT,
    private_value NUMERIC(12,2),
    delivery_date TIMESTAMP WITH TIME ZONE,
    lab_guides JSONB DEFAULT '[]'::jsonb,
    attachments JSONB DEFAULT '[]'::jsonb,
    registered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    registered_by_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_orders TO authenticated;
GRANT ALL ON public.attendance_orders TO service_role;
GRANT SELECT ON public.attendance_orders TO anon;

ALTER TABLE public.attendance_orders ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'attendance_orders' AND policyname = 'Users can manage their company attendance orders') THEN
        CREATE POLICY "Users can manage their company attendance orders"
            ON public.attendance_orders FOR ALL
            TO authenticated
            USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
    END IF;
END $$;

-- Refresh PostgREST cache
NOTIFY pgrst, 'reload schema';
