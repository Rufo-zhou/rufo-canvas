alter table public.generation_tasks
  drop constraint if exists generation_tasks_provider_check;

alter table public.generated_assets
  drop constraint if exists generated_assets_provider_check;

alter table public.generated_assets
  add column if not exists media_type text not null default 'image'
    check (media_type in ('image', 'video')),
  add column if not exists duration_seconds numeric;
