-- Mi Estudio · Supabase (plan FREE)
-- Ejecutar una sola vez en Supabase → SQL Editor → New query → Run.

-- 1) Estado de cada persona (un documento JSON por cuenta)
create table if not exists public.estados (
  user_id uuid primary key references auth.users (id) on delete cascade,
  datos jsonb not null default '{}'::jsonb,
  actualizado timestamptz not null default now()
);

alter table public.estados enable row level security;

drop policy if exists "cada uno ve su estado" on public.estados;
create policy "cada uno ve su estado"
  on public.estados
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 2) Bucket privado para las fotos (apuntes, horario, personaje)
insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', false)
on conflict (id) do nothing;

-- Cada persona solo puede leer/escribir dentro de su carpeta: <user_id>/...
drop policy if exists "fotos: leer las mías" on storage.objects;
create policy "fotos: leer las mías"
  on storage.objects
  for select
  using (bucket_id = 'fotos' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "fotos: subir las mías" on storage.objects;
create policy "fotos: subir las mías"
  on storage.objects
  for insert
  with check (bucket_id = 'fotos' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "fotos: borrar las mías" on storage.objects;
create policy "fotos: borrar las mías"
  on storage.objects
  for delete
  using (bucket_id = 'fotos' and auth.uid()::text = (storage.foldername(name))[1]);
