create schema if not exists vault;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists supabase_vault with schema vault;

alter table public.profiles
  add column if not exists display_name_ciphertext bytea,
  add column if not exists avatar_url_ciphertext bytea,
  add column if not exists privacy_key_version integer not null default 1;

do $$
begin
  if not exists (
    select 1
    from vault.decrypted_secrets
    where name = 'civiq_profile_aes256_key'
  ) then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'civiq_profile_aes256_key',
      'CivIQ profile details AES-256 encryption key'
    );
  end if;
end $$;

create or replace function public.civiq_profile_aes256_key()
returns text
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  key_value text;
begin
  select decrypted_secret
    into key_value
  from vault.decrypted_secrets
  where name = 'civiq_profile_aes256_key'
  order by created_at desc
  limit 1;

  if key_value is null then
    raise exception 'CivIQ profile AES-256 key is not configured';
  end if;

  return key_value;
end;
$$;

create or replace function public.encrypt_profile_detail(value text)
returns bytea
language sql
security definer
set search_path = public, extensions
as $$
  select case
    when nullif(value, '') is null then null
    else extensions.pgp_sym_encrypt(
      value,
      public.civiq_profile_aes256_key(),
      'cipher-algo=aes256, compress-algo=1, unicode-mode=1'
    )
  end;
$$;

create or replace function public.decrypt_profile_detail(value bytea)
returns text
language sql
security definer
set search_path = public, extensions
as $$
  select case
    when value is null then null
    else extensions.pgp_sym_decrypt(
      value,
      public.civiq_profile_aes256_key(),
      'unicode-mode=1'
    )
  end;
$$;

create or replace function public.profiles_encrypt_private_details()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.display_name_ciphertext := public.encrypt_profile_detail(coalesce(new.display_name, new.username));
    new.avatar_url_ciphertext := public.encrypt_profile_detail(new.avatar_url);
  else
    if new.display_name is distinct from old.display_name then
      new.display_name_ciphertext := public.encrypt_profile_detail(coalesce(new.display_name, new.username));
    end if;

    if new.avatar_url is distinct from old.avatar_url then
      new.avatar_url_ciphertext := public.encrypt_profile_detail(new.avatar_url);
    end if;
  end if;

  new.display_name := new.username;
  new.avatar_url := null;
  new.privacy_key_version := 1;
  return new;
end;
$$;

update public.profiles
set
  display_name_ciphertext = coalesce(display_name_ciphertext, public.encrypt_profile_detail(display_name)),
  avatar_url_ciphertext = case
    when avatar_url is not null and avatar_url_ciphertext is null then public.encrypt_profile_detail(avatar_url)
    else avatar_url_ciphertext
  end,
  display_name = username,
  avatar_url = null,
  privacy_key_version = 1;

drop trigger if exists profiles_encrypt_private_details on public.profiles;
create trigger profiles_encrypt_private_details
  before insert or update of username, display_name, avatar_url
  on public.profiles
  for each row
  execute function public.profiles_encrypt_private_details();

create or replace function public.my_private_profile()
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  visibility text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    profiles.id,
    profiles.username,
    coalesce(public.decrypt_profile_detail(profiles.display_name_ciphertext), profiles.display_name) as display_name,
    coalesce(public.decrypt_profile_detail(profiles.avatar_url_ciphertext), profiles.avatar_url) as avatar_url,
    profiles.visibility,
    profiles.created_at
  from public.profiles
  where profiles.id = auth.uid();
$$;

drop policy if exists "profiles are readable" on public.profiles;
drop policy if exists "authenticated profiles are readable" on public.profiles;
create policy "authenticated profiles are readable" on public.profiles
  for select
  to authenticated
  using (true);

revoke execute on function public.civiq_profile_aes256_key() from public, anon, authenticated;
revoke execute on function public.encrypt_profile_detail(text) from public, anon, authenticated;
revoke execute on function public.decrypt_profile_detail(bytea) from public, anon, authenticated;
revoke execute on function public.profiles_encrypt_private_details() from public, anon, authenticated;
grant execute on function public.my_private_profile() to authenticated;

revoke select(display_name_ciphertext, avatar_url_ciphertext) on public.profiles from anon, authenticated;
