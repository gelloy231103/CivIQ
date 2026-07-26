create table if not exists public.quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  selection_key text not null,
  mode text not null check (mode in ('quick', 'focused', 'mock')),
  question_ids text[] not null,
  current_index integer not null default 0 check (current_index >= 0),
  answers jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  last_updated_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists quiz_sessions_user_updated_idx
  on public.quiz_sessions (user_id, last_updated_at desc);

create unique index if not exists quiz_sessions_one_active_per_mode_idx
  on public.quiz_sessions (user_id, selection_key, mode)
  where finished_at is null;

alter table public.quiz_sessions enable row level security;

drop policy if exists "users read own quiz sessions" on public.quiz_sessions;
drop policy if exists "users insert own quiz sessions" on public.quiz_sessions;
drop policy if exists "users update own quiz sessions" on public.quiz_sessions;
drop policy if exists "users delete own quiz sessions" on public.quiz_sessions;

create policy "users read own quiz sessions"
  on public.quiz_sessions for select
  using (auth.uid() = user_id);

create policy "users insert own quiz sessions"
  on public.quiz_sessions for insert
  with check (auth.uid() = user_id);

create policy "users update own quiz sessions"
  on public.quiz_sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users delete own quiz sessions"
  on public.quiz_sessions for delete
  using (auth.uid() = user_id);
