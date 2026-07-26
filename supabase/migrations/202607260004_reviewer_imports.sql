create table if not exists public.reviewer_import_batches (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete set null,
  year integer not null check (year between 2000 and 2100),
  title text not null,
  status text not null default 'uploading' check (status in ('uploading', 'uploaded', 'failed', 'processing', 'ready_for_review')),
  file_count integer not null default 0,
  supported_count integer not null default 0,
  unsupported_count integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reviewer_import_files (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.reviewer_import_batches(id) on delete cascade,
  original_name text not null,
  storage_path text,
  mime_type text,
  size_bytes bigint not null default 0,
  extension text not null default '',
  supported boolean not null default false,
  status text not null default 'pending_upload' check (status in ('pending_upload', 'uploaded', 'unsupported', 'failed')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reviewer_import_batches_created_at_idx
  on public.reviewer_import_batches (created_at desc);

create index if not exists reviewer_import_files_batch_id_idx
  on public.reviewer_import_files (batch_id);

alter table public.reviewer_import_batches enable row level security;
alter table public.reviewer_import_files enable row level security;

insert into storage.buckets (id, name, public)
values ('reviewer-sources', 'reviewer-sources', false)
on conflict (id) do update
set public = false;
