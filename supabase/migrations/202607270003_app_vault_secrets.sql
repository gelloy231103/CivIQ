create schema if not exists vault;
create extension if not exists supabase_vault with schema vault;

create or replace function public.civiq_vault_secret(secret_name text)
returns table (
  value text
)
language sql
stable
security definer
set search_path = public, vault
as $$
  select decrypted_secret as value
  from vault.decrypted_secrets
  where name = secret_name
    and secret_name in ('civiq_gemini_api_key')
  order by created_at desc
  limit 1;
$$;

revoke execute on function public.civiq_vault_secret(text) from public, anon, authenticated;
grant execute on function public.civiq_vault_secret(text) to service_role;

create or replace function public.civiq_set_vault_secret(secret_name text, secret_value text)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  existing_id uuid;
begin
  if secret_name <> 'civiq_gemini_api_key' then
    raise exception 'Secret is not allowed';
  end if;

  select id
    into existing_id
  from vault.decrypted_secrets
  where name = secret_name
  order by updated_at desc
  limit 1;

  if existing_id is null then
    perform vault.create_secret(
      secret_value,
      secret_name,
      'CivIQ app secret'
    );
  else
    perform vault.update_secret(
      existing_id,
      secret_value,
      secret_name,
      'CivIQ app secret'
    );
  end if;
end;
$$;

revoke execute on function public.civiq_set_vault_secret(text, text) from public, anon, authenticated;
grant execute on function public.civiq_set_vault_secret(text, text) to service_role;
