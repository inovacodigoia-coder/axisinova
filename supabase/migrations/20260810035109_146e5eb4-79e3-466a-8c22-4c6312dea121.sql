create table public.lab_settings (
    id uuid primary key default gen_random_uuid(),
    company_id uuid references public.companies(id) on delete cascade not null,
    report_header_title text,
    report_header_subtitle text,
    report_logo_primary_url text,
    report_logo_secondary_url text,
    report_institutional_warning text,
    report_footer_text text,
    report_watermark_enabled boolean default true,
    report_watermark_text text default '[ CÓPIA NÃO AUTENTICADA ]',
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    unique(company_id)
);

grant select, insert, update, delete on public.lab_settings to authenticated;
grant all on public.lab_settings to service_role;

alter table public.lab_settings enable row level security;

create policy "Users can manage their own company lab settings"
on public.lab_settings
for all
to authenticated
using (company_id = (select company_id from public.profiles where id = auth.uid()))
with check (company_id = (select company_id from public.profiles where id = auth.uid()));