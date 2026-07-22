
-- Create lab_workbenches table
CREATE TABLE public.lab_workbenches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Add column to exams
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS workbench_id uuid;

-- Enable RLS
ALTER TABLE public.lab_workbenches ENABLE ROW LEVEL SECURITY;

-- Grant access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_workbenches TO authenticated;
GRANT ALL ON public.lab_workbenches TO service_role;

-- Policies
CREATE POLICY "Users can view workbenches from their company"
ON public.lab_workbenches
FOR SELECT
TO authenticated
USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage workbenches from their company"
ON public.lab_workbenches
FOR ALL
TO authenticated
USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
