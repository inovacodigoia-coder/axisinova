-- Create lab_exam_reference_values table
CREATE TABLE public.lab_exam_reference_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
    parameter_id UUID REFERENCES public.lab_exam_parameters(id) ON DELETE CASCADE,
    internal_code TEXT, -- Exam code for easier lookup/mapping
    parameter_name TEXT,
    description TEXT, -- e.g. "Normal", "Adulto Masculino"
    gender TEXT DEFAULT 'both', -- male, female, both, pregnant
    age_min INTEGER DEFAULT 0,
    age_max INTEGER DEFAULT 120,
    min_value TEXT,
    max_value TEXT,
    text_range TEXT, -- For text-based references
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_exam_reference_values TO authenticated;
GRANT ALL ON public.lab_exam_reference_values TO service_role;

-- Enable RLS
ALTER TABLE public.lab_exam_reference_values ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Users can manage their company's lab exam reference values"
ON public.lab_exam_reference_values
FOR ALL
TO authenticated
USING (company_id = (auth.jwt() ->> 'company_id')::uuid)
WITH CHECK (company_id = (auth.jwt() ->> 'company_id')::uuid);

-- Indexes
CREATE INDEX idx_lab_refs_exam_id ON public.lab_exam_reference_values(exam_id);
CREATE INDEX idx_lab_refs_company_id ON public.lab_exam_reference_values(company_id);
CREATE INDEX idx_lab_refs_parameter_id ON public.lab_exam_reference_values(parameter_id);