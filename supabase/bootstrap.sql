-- ============================================================
-- DESKRA — Bootstrap
-- Jalankan file ini SEKALI di Supabase SQL Editor
-- sebelum menggunakan migration runner (npm run migrate)
-- ============================================================

-- Fungsi helper agar migration runner bisa eksekusi DDL
create or replace function run_sql(sql text)
returns void
language plpgsql
security definer
as $$
begin
  execute sql;
end;
$$;

-- Tabel tracking migrasi
create table if not exists _deskra_migrations (
  id         serial primary key,
  filename   text not null unique,
  applied_at timestamp with time zone default now()
);
