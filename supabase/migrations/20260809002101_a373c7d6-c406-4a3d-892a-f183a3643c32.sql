-- Create lab_exam_parameters table
CREATE TABLE public.lab_exam_parameters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
    internal_code TEXT, -- Exam internal code for easier mapping
    name TEXT NOT NULL,
    section TEXT,
    equipment_code TEXT,
    type TEXT DEFAULT 'numeric', -- numeric, text, formula, etc.
    origin TEXT DEFAULT 'manual', -- manual, interface, formula
    unit TEXT,
    reference_values TEXT, -- text representation of reference ranges
    is_required BOOLEAN DEFAULT true,
    allow_negative BOOLEAN DEFAULT false,
    is_calculated BOOLEAN DEFAULT false,
    formula TEXT,
    is_hidden BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_exam_parameters TO authenticated;
GRANT ALL ON public.lab_exam_parameters TO service_role;

-- Enable RLS
ALTER TABLE public.lab_exam_parameters ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Users can manage their company's lab exam parameters"
ON public.lab_exam_parameters
FOR ALL
TO authenticated
USING (company_id = (auth.jwt() ->> 'company_id')::uuid)
WITH CHECK (company_id = (auth.jwt() ->> 'company_id')::uuid);

-- Index for performance
CREATE INDEX idx_lab_exam_parameters_exam_id ON public.lab_exam_parameters(exam_id);
CREATE INDEX idx_lab_exam_parameters_company_id ON public.lab_exam_parameters(company_id);
CREATE INDEX idx_lab_exam_parameters_internal_code ON public.lab_exam_parameters(internal_code);
