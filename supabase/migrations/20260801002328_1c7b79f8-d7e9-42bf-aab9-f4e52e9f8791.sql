
create or replace function public.device_public_info(_kind text, _slug text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r record; b record; c record; res jsonb;
begin
  if _kind = 'totem' then
    select t.id, t.unit_id, t.company_id, t.name, t.slug,
           (t.access_username is not null and t.access_password is not null) as requires_auth
      into r from public.queue_totems t where t.slug = _slug limit 1;
    if not found then return null; end if;
    res := jsonb_build_object('id', r.id, 'unit_id', r.unit_id, 'company_id', r.company_id,
      'name', r.name, 'slug', r.slug, 'requires_auth', r.requires_auth);
  elsif _kind = 'tv' then
    select t.id, t.unit_id, t.company_id, t.name, t.slug, t.voice_type, t.media_mode, t.media_attachments,
           (t.access_username is not null and t.access_password is not null) as requires_auth
      into r from public.queue_tvs t where t.slug = _slug limit 1;
    if not found then return null; end if;
    res := jsonb_build_object('id', r.id, 'unit_id', r.unit_id, 'company_id', r.company_id,
      'name', r.name, 'slug', r.slug, 'requires_auth', r.requires_auth,
      'voice_type', r.voice_type, 'media_mode', r.media_mode, 'media_attachments', r.media_attachments);
  else
    return null;
  end if;

  select co.name, co.nome_fantasia into c from public.companies co where co.id = (res->>'company_id')::uuid;
  select cb.primary_color, cb.secondary_color, cb.logo_url into b from public.company_branding cb where cb.company_id = (res->>'company_id')::uuid;

  return res || jsonb_build_object(
    'company_name', coalesce(c.nome_fantasia, c.name),
    'logo_url', b.logo_url, 'primary_color', b.primary_color, 'secondary_color', b.secondary_color);
end $$;

create or replace function public.device_verify_access(_kind text, _slug text, _username text, _password text)
returns boolean language sql stable security definer set search_path = public as $$
  select case when _kind = 'totem' then exists (
      select 1 from public.queue_totems t where t.slug = _slug
        and t.access_username = _username and t.access_password = _password)
    when _kind = 'tv' then exists (
      select 1 from public.queue_tvs t where t.slug = _slug
        and t.access_username = _username and t.access_password = _password)
    else false end;
$$;

create or replace function public.totem_queue_lines(_slug text)
returns table (id uuid, unit_id uuid, company_id uuid, name text, prefix text, prefix_alt text,
  color text, has_preferential boolean, has_preferential_80 boolean, allow_totem_choice boolean,
  show_on_totem boolean, is_active boolean, totem_id uuid)
language sql stable security definer set search_path = public as $$
  select l.id, l.unit_id, l.company_id, l.name, l.prefix, l.prefix_alt, l.color,
         l.has_preferential, l.has_preferential_80, l.allow_totem_choice, l.show_on_totem, l.is_active, l.totem_id
  from public.queue_lines l
  join public.queue_totems t on t.id = l.totem_id
  where t.slug = _slug and l.is_active and l.show_on_totem
  order by l.sort_order asc;
$$;

create or replace function public.panel_tickets(_slug text)
returns table (id uuid, unit_id uuid, queue_line_name text, display_code text, status text,
  guiche_name text, attendant_name text, called_at timestamptz, generated_at timestamptz,
  tv_id uuid, call_count integer)
language sql stable security definer set search_path = public as $$
  select k.id, k.unit_id, k.queue_line_name, k.display_code, k.status, k.guiche_name, k.attendant_name,
         k.called_at, k.generated_at, k.tv_id, k.call_count
  from public.queue_tickets k
  join public.queue_tvs v on v.unit_id = k.unit_id
  where v.slug = _slug and k.generated_at >= date_trunc('day', now() at time zone 'America/Sao_Paulo')
  order by k.generated_at asc;
$$;

create or replace function public.totem_create_ticket(_slug text, _queue_line_id uuid, _preferential boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare l record; pfx text; nxt integer; code text;
begin
  select li.* into l from public.queue_lines li
    join public.queue_totems t on t.id = li.totem_id
   where t.slug = _slug and li.id = _queue_line_id and li.is_active and li.show_on_totem;
  if not found then raise exception 'Fila não encontrada para este totem'; end if;
  pfx := case when _preferential and l.prefix_alt is not null then l.prefix_alt else l.prefix end;
  select coalesce(max(k.number), 0) + 1 into nxt from public.queue_tickets k
    where k.queue_line_id = l.id and k.prefix = pfx
      and k.generated_at >= date_trunc('day', now() at time zone 'America/Sao_Paulo');
  code := pfx || lpad(nxt::text, 3, '0');
  insert into public.queue_tickets (company_id, unit_id, queue_line_id, queue_line_name, prefix, number, display_code, status)
  values (l.company_id, l.unit_id, l.id, l.name, pfx, nxt, code, 'waiting');
  return jsonb_build_object('display_code', code, 'number', nxt, 'prefix', pfx);
end $$;

grant execute on function public.device_public_info(text, text) to anon, authenticated;
grant execute on function public.device_verify_access(text, text, text, text) to anon, authenticated;
grant execute on function public.totem_queue_lines(text) to anon, authenticated;
grant execute on function public.panel_tickets(text) to anon, authenticated;
grant execute on function public.totem_create_ticket(text, uuid, boolean) to anon, authenticated;
