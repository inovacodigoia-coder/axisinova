-- Create table for profile-sector assignments
CREATE TABLE IF NOT EXISTS public.profiles_sectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL,
    sector_id TEXT NOT NULL,
    company_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(profile_id, sector_id)
);

-- Grant access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles_sectors TO authenticated;
GRANT ALL ON public.profiles_sectors TO service_role;

-- Enable RLS
ALTER TABLE public.profiles_sectors ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view assignments for their company"
ON public.profiles_sectors FOR SELECT
TO authenticated
USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage assignments"
ON public.profiles_sectors FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role IN ('company_admin', 'super_admin')
    )
);
