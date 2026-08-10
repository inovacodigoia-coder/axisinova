-- 1. Create app_role enum
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM (
        'company_admin', 
        'doctor', 
        'receptionist', 
        'billing', 
        'telephonist', 
        'nurse', 
        'pharmacist', 
        'biochemist', 
        'analyst', 
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Set Up the user_roles Table
CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.app_role NOT NULL,
    UNIQUE (user_id, role)
);

-- 3. Grant Data API access to user_roles
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- 4. Enable Row-Level Security on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 5. Create a Security Definer Function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 6. Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, role::public.app_role 
FROM public.profiles
ON CONFLICT (user_id, role) DO NOTHING;

-- 7. Create a Security Definer Function to get user company_id without recursion
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = _user_id;
$$;

-- 8. Fix profiles RLS policies
-- First, drop existing restrictive select policy if it exists
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Company members can read other members" ON public.profiles;
DROP POLICY IF EXISTS "Company admins can read company profiles" ON public.profiles;
DROP POLICY IF EXISTS "Company admins can update company profiles" ON public.profiles;

-- Create broad policies that allow company admins to see everyone in their company
CREATE POLICY "Super admins can read all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (private.is_super_admin());

CREATE POLICY "Users can read own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Company admins can read company profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'company_admin') 
  AND company_id = public.get_user_company_id(auth.uid())
);

-- Update and Delete policies for company admins
CREATE POLICY "Company admins can update company profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'company_admin') 
  AND company_id = public.get_user_company_id(auth.uid())
)
WITH CHECK (
  public.has_role(auth.uid(), 'company_admin') 
  AND company_id = public.get_user_company_id(auth.uid())
);

-- 9. Update handle_new_user trigger to sync user_roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (
    id, 
    full_name, 
    cpf, 
    role, 
    company_id,
    badge_code
  )
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'cpf', 
    new.raw_user_meta_data->>'role', 
    (new.raw_user_meta_data->>'company_id')::uuid,
    new.raw_user_meta_data->>'badge_code'
  );

  -- Insert into user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    new.id, 
    (new.raw_user_meta_data->>'role')::public.app_role
  );

  RETURN new;
END;
$$;
