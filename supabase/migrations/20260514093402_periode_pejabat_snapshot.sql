alter table if exists public.tabel_periode
  add column if not exists pejabat_snapshot jsonb;
