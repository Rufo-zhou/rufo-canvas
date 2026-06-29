create extension if not exists "pgcrypto";

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.canvas_snapshots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  version integer not null,
  snapshot jsonb not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (project_id, version)
);

create table if not exists public.generation_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  provider text not null check (provider in ('nano-banana', 'gptlmage2')),
  prompt text not null,
  negative_prompt text,
  status text not null default 'pending' check (status in ('draft', 'pending', 'processing', 'completed', 'failed')),
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb,
  error_message text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.generated_assets (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.generation_tasks(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  provider text not null check (provider in ('nano-banana', 'gptlmage2')),
  prompt text not null,
  storage_bucket text,
  storage_path text,
  source_url text,
  width integer,
  height integer,
  mime_type text,
  metadata jsonb,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists projects_owner_id_idx on public.projects(owner_id);
create index if not exists canvas_snapshots_project_id_version_idx on public.canvas_snapshots(project_id, version desc);
create index if not exists generation_tasks_project_id_created_at_idx on public.generation_tasks(project_id, created_at desc);
create index if not exists generated_assets_project_id_created_at_idx on public.generated_assets(project_id, created_at desc);

insert into storage.buckets (id, name, public)
values ('generated-assets', 'generated-assets', false)
on conflict (id) do nothing;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

drop trigger if exists set_generation_tasks_updated_at on public.generation_tasks;
create trigger set_generation_tasks_updated_at
before update on public.generation_tasks
for each row execute function public.set_updated_at();

alter table public.projects enable row level security;
alter table public.canvas_snapshots enable row level security;
alter table public.generation_tasks enable row level security;
alter table public.generated_assets enable row level security;

drop policy if exists "Users can read own projects" on public.projects;
create policy "Users can read own projects"
on public.projects for select
using (owner_id = auth.uid());

drop policy if exists "Users can insert own projects" on public.projects;
create policy "Users can insert own projects"
on public.projects for insert
with check (owner_id = auth.uid());

drop policy if exists "Users can update own projects" on public.projects;
create policy "Users can update own projects"
on public.projects for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "Users can delete own projects" on public.projects;
create policy "Users can delete own projects"
on public.projects for delete
using (owner_id = auth.uid());

drop policy if exists "Users can read own canvas snapshots" on public.canvas_snapshots;
create policy "Users can read own canvas snapshots"
on public.canvas_snapshots for select
using (
  exists (
    select 1 from public.projects
    where projects.id = canvas_snapshots.project_id
      and projects.owner_id = auth.uid()
  )
);

drop policy if exists "Users can insert own canvas snapshots" on public.canvas_snapshots;
create policy "Users can insert own canvas snapshots"
on public.canvas_snapshots for insert
with check (
  created_by = auth.uid()
  and exists (
    select 1 from public.projects
    where projects.id = canvas_snapshots.project_id
      and projects.owner_id = auth.uid()
  )
);

drop policy if exists "Users can read own generation tasks" on public.generation_tasks;
create policy "Users can read own generation tasks"
on public.generation_tasks for select
using (
  exists (
    select 1 from public.projects
    where projects.id = generation_tasks.project_id
      and projects.owner_id = auth.uid()
  )
);

drop policy if exists "Users can insert own generation tasks" on public.generation_tasks;
create policy "Users can insert own generation tasks"
on public.generation_tasks for insert
with check (
  created_by = auth.uid()
  and exists (
    select 1 from public.projects
    where projects.id = generation_tasks.project_id
      and projects.owner_id = auth.uid()
  )
);

drop policy if exists "Users can update own generation tasks" on public.generation_tasks;
create policy "Users can update own generation tasks"
on public.generation_tasks for update
using (
  exists (
    select 1 from public.projects
    where projects.id = generation_tasks.project_id
      and projects.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.projects
    where projects.id = generation_tasks.project_id
      and projects.owner_id = auth.uid()
  )
);

drop policy if exists "Users can read own generated assets" on public.generated_assets;
create policy "Users can read own generated assets"
on public.generated_assets for select
using (
  exists (
    select 1 from public.projects
    where projects.id = generated_assets.project_id
      and projects.owner_id = auth.uid()
  )
);

drop policy if exists "Users can insert own generated assets" on public.generated_assets;
create policy "Users can insert own generated assets"
on public.generated_assets for insert
with check (
  created_by = auth.uid()
  and exists (
    select 1 from public.projects
    where projects.id = generated_assets.project_id
      and projects.owner_id = auth.uid()
  )
);

drop policy if exists "Users can upload generated asset files" on storage.objects;
create policy "Users can upload generated asset files"
on storage.objects for insert
with check (
  bucket_id = 'generated-assets'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "Users can read generated asset files" on storage.objects;
create policy "Users can read generated asset files"
on storage.objects for select
using (
  bucket_id = 'generated-assets'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "Users can update generated asset files" on storage.objects;
create policy "Users can update generated asset files"
on storage.objects for update
using (
  bucket_id = 'generated-assets'
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id = 'generated-assets'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "Users can delete generated asset files" on storage.objects;
create policy "Users can delete generated asset files"
on storage.objects for delete
using (
  bucket_id = 'generated-assets'
  and split_part(name, '/', 1) = auth.uid()::text
);
