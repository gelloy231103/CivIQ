drop policy if exists "users read follows involving self" on public.follows;

create policy "users read follows involving self"
  on public.follows
  for select
  using (auth.uid() = follower_id or auth.uid() = following_id);
