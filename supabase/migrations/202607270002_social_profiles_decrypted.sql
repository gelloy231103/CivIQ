create or replace function public.social_profiles()
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
    coalesce(public.decrypt_profile_detail(profiles.display_name_ciphertext), profiles.display_name, profiles.username) as display_name,
    coalesce(public.decrypt_profile_detail(profiles.avatar_url_ciphertext), profiles.avatar_url) as avatar_url,
    profiles.visibility,
    profiles.created_at
  from public.profiles
  where auth.role() = 'authenticated';
$$;

revoke execute on function public.social_profiles() from public, anon;
grant execute on function public.social_profiles() to authenticated;
