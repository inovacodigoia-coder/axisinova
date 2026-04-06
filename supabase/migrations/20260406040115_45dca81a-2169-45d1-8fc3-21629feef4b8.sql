
-- Extend companies table with registration fields
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS nome_fantasia text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS segmento text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS telefone text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS plano text DEFAULT 'Pro';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS cep text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS logradouro text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS numero text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS complemento text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS bairro text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS cidade text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS estado text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS medicos_ativos integer DEFAULT 0;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS medicos_limite integer DEFAULT 15;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS usuarios_ativos integer DEFAULT 0;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS usuarios_limite integer DEFAULT 999;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS armazenamento_usado_gb numeric DEFAULT 0;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS armazenamento_limite_gb numeric DEFAULT 100;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS valor_mensal numeric DEFAULT 0;

-- Allow anyone to insert companies (registration flow)
CREATE POLICY "Anyone can insert companies" ON public.companies FOR INSERT WITH CHECK (true);
-- Allow authenticated users to read companies
CREATE POLICY "Authenticated can read companies" ON public.companies FOR SELECT TO authenticated USING (true);

-- Create profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  cpf text,
  role text NOT NULL DEFAULT 'company_admin',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Allow insert during signup" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Super admins can read all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  RAISE LOG 'handle_new_user triggered for user %', NEW.id;
  INSERT INTO public.profiles (id, full_name, cpf, role, company_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'cpf', NULL),
    COALESCE(NEW.raw_user_meta_data->>'role', 'company_admin'),
    CASE WHEN NEW.raw_user_meta_data->>'company_id' IS NOT NULL 
         THEN (NEW.raw_user_meta_data->>'company_id')::uuid 
         ELSE NULL END
  );
  RAISE LOG 'Profile created for user %', NEW.id;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Trigger error for user %: % %', NEW.id, SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add updated_at trigger to profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
