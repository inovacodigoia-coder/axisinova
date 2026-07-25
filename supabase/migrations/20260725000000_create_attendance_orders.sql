CREATE TABLE public.attendance_orders (
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

-- Indices for performance
CREATE INDEX idx_attendance_orders_company ON public.attendance_orders(company_id);
CREATE INDEX idx_attendance_orders_patient ON public.attendance_orders(patient_id);
CREATE INDEX idx_attendance_orders_protocol ON public.attendance_orders(protocol);

-- RLS
ALTER TABLE public.attendance_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company attendance orders"
    ON public.attendance_orders FOR SELECT
    TO authenticated
    USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert attendance orders for their company"
    ON public.attendance_orders FOR INSERT
    TO authenticated
    WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update attendance orders in their company"
    ON public.attendance_orders FOR UPDATE
    TO authenticated
    USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete attendance orders in their company"
    ON public.attendance_orders FOR DELETE
    TO authenticated
    USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_orders TO authenticated;
GRANT ALL ON public.attendance_orders TO service_role;

-- Update trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_attendance_orders_updated_at
    BEFORE UPDATE ON public.attendance_orders
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
