-- ============================================================
-- DESKRA — Audit Trail: tabel_activity_log
-- Log immutable untuk setiap aksi create/update/delete.
-- ============================================================
create table if not exists tabel_activity_log (
  id            uuid default gen_random_uuid() primary key,
  created_at    timestamptz default now(),
  tpk_id        uuid not null references tabel_tpk(id) on delete cascade,
  user_id       uuid references auth.users(id) on delete set null,
  nama_operator text,
  action        text not null check (action in ('create', 'update', 'delete')),
  entity_type   text not null,
  entity_id     uuid,
  entity_label  text,
  diff          jsonb
);

create index if not exists idx_activity_log_tpk_created
  on tabel_activity_log(tpk_id, created_at desc);

alter table tabel_activity_log enable row level security;

-- Operator baca log TPK sendiri; admin baca semua
create policy "activity_log_select" on tabel_activity_log
  for select using (tpk_id = my_tpk_id() or is_admin());

-- Semua authenticated user bisa insert (client-side logging)
create policy "activity_log_insert" on tabel_activity_log
  for insert with check (tpk_id = my_tpk_id() or is_admin());

-- Tidak ada update/delete — log bersifat immutable
