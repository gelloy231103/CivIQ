update auth.users
set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) - 'display_name' - 'username'
where coalesce(raw_user_meta_data, '{}'::jsonb) ?| array['display_name', 'username'];

drop policy if exists "profiles are readable" on public.profiles;
drop policy if exists "authenticated profiles are readable" on public.profiles;
drop policy if exists "users read own profile" on public.profiles;

create policy "users read own profile"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "leaderboard stats readable" on public.leaderboard_stats;

create or replace function public.leaderboard_rows()
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  visibility text,
  created_at timestamptz,
  score integer,
  accuracy numeric,
  completed_questions integer,
  current_streak integer,
  best_streak integer
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
    profiles.created_at,
    coalesce(leaderboard_stats.score, 0) as score,
    coalesce(leaderboard_stats.accuracy, 0) as accuracy,
    coalesce(leaderboard_stats.completed_questions, 0) as completed_questions,
    coalesce(leaderboard_stats.current_streak, 0) as current_streak,
    coalesce(leaderboard_stats.best_streak, 0) as best_streak
  from public.profiles
  left join public.leaderboard_stats on leaderboard_stats.user_id = profiles.id
  where auth.role() = 'authenticated'
    and (
      profiles.id = auth.uid()
      or profiles.visibility = 'global'
      or (
        exists (
          select 1
          from public.follows outgoing
          where outgoing.follower_id = auth.uid()
            and outgoing.following_id = profiles.id
        )
        and exists (
          select 1
          from public.follows incoming
          where incoming.follower_id = profiles.id
            and incoming.following_id = auth.uid()
        )
      )
    );
$$;

revoke execute on function public.leaderboard_rows() from public, anon;
grant execute on function public.leaderboard_rows() to authenticated;
