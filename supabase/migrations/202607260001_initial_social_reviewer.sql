create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text not null,
  avatar_url text,
  visibility text not null default 'friends' check (visibility in ('friends', 'global')),
  created_at timestamptz not null default now()
);

create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  question_id text not null,
  selected_choice text not null,
  is_correct boolean not null,
  mode text not null check (mode in ('review', 'quiz')),
  answered_at timestamptz not null default now()
);

create table if not exists public.question_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  question_id text not null,
  attempt_count integer not null default 0,
  correct_count integer not null default 0,
  incorrect_count integer not null default 0,
  last_answered_at timestamptz,
  mistake_active boolean not null default false,
  primary key (user_id, question_id)
);

create table if not exists public.bookmarks (
  user_id uuid not null references public.profiles(id) on delete cascade,
  question_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, question_id)
);

create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create table if not exists public.leaderboard_stats (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  score integer not null default 0,
  accuracy numeric not null default 0,
  completed_questions integer not null default 0,
  current_streak integer not null default 0,
  best_streak integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_explanations (
  id uuid primary key default gen_random_uuid(),
  question_id text not null,
  selected_choice text,
  prompt_version text not null,
  provider text not null,
  explanation text not null,
  created_at timestamptz not null default now(),
  unique (question_id, selected_choice, prompt_version)
);

create table if not exists public.ai_usage (
  user_id uuid not null references public.profiles(id) on delete cascade,
  usage_date date not null,
  request_count integer not null default 0,
  primary key (user_id, usage_date)
);

alter table public.profiles enable row level security;
alter table public.attempts enable row level security;
alter table public.question_progress enable row level security;
alter table public.bookmarks enable row level security;
alter table public.follows enable row level security;
alter table public.leaderboard_stats enable row level security;
alter table public.ai_explanations enable row level security;
alter table public.ai_usage enable row level security;

drop policy if exists "profiles are readable" on public.profiles;
drop policy if exists "users update own profile" on public.profiles;
drop policy if exists "users insert own profile" on public.profiles;
drop policy if exists "users read own attempts" on public.attempts;
drop policy if exists "users insert own attempts" on public.attempts;
drop policy if exists "users manage own progress" on public.question_progress;
drop policy if exists "users manage own bookmarks" on public.bookmarks;
drop policy if exists "users manage own follows" on public.follows;
drop policy if exists "leaderboard stats readable" on public.leaderboard_stats;
drop policy if exists "users manage own leaderboard stats" on public.leaderboard_stats;
drop policy if exists "ai explanations readable by authenticated users" on public.ai_explanations;
drop policy if exists "users read own ai usage" on public.ai_usage;
drop policy if exists "users insert own ai usage" on public.ai_usage;
drop policy if exists "users update own ai usage" on public.ai_usage;

create policy "profiles are readable" on public.profiles for select using (true);
create policy "users update own profile" on public.profiles for update using (auth.uid() = id);
create policy "users insert own profile" on public.profiles for insert with check (auth.uid() = id);

create policy "users read own attempts" on public.attempts for select using (auth.uid() = user_id);
create policy "users insert own attempts" on public.attempts for insert with check (auth.uid() = user_id);

create policy "users manage own progress" on public.question_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own bookmarks" on public.bookmarks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own follows" on public.follows for all using (auth.uid() = follower_id) with check (auth.uid() = follower_id);

create policy "leaderboard stats readable" on public.leaderboard_stats for select using (true);
create policy "users manage own leaderboard stats" on public.leaderboard_stats for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "ai explanations readable by authenticated users" on public.ai_explanations for select using (auth.role() = 'authenticated');
create policy "users read own ai usage" on public.ai_usage for select using (auth.uid() = user_id);
create policy "users insert own ai usage" on public.ai_usage for insert with check (auth.uid() = user_id);
create policy "users update own ai usage" on public.ai_usage for update using (auth.uid() = user_id);
