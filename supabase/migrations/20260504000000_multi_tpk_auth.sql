-- ============================================================
-- DESKRA — Multi-TPK Authentication & Row Level Security
-- Mengubah aplikasi dari single-tenant menjadi multi-tenant.
-- Semua data dipisah per TPK menggunakan kolom tpk_id + RLS.
-- ============================================================

-- ============================================================
-- 1. Tabel master TPK
-- ============================================================
create table if not exists tabel_tpk (
  id         uuid default gen_random_uuid() primary key,
  nama_tpk   text not null,
  kode_tpk   char(7) check (kode_tpk ~ '^\d{7}$'),
  aktif      boolean not null default true,
  created_at timestamptz default now()
);

-- ============================================================
-- 2. Profiles — jembatan auth.users ↔ TPK
-- ============================================================
create table if not exists profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  tpk_id        uuid references tabel_tpk(id) on delete set null,
  role          text not null default 'operator' check (role in ('operator', 'admin')),
  nama_operator text,
  created_at    timestamptz default now()
);

-- ============================================================
-- 3. Seed TPK Wongsorejo (data lama akan dimigrasi ke sini)
-- ============================================================
do $$
declare
  v_tpk_id uuid;
begin
  -- Insert jika belum ada
  insert into tabel_tpk (nama_tpk, kode_tpk)
  values ('Wongsorejo', null)
  on conflict do nothing;

  select id into v_tpk_id from tabel_tpk where nama_tpk = 'Wongsorejo' limit 1;

  -- ============================================================
  -- 4. Tambah kolom tpk_id ke semua tabel operasional (nullable dulu)
  -- ============================================================

  -- Root tables (tidak punya periode_id)
  alter table tabel_pejabat          add column if not exists tpk_id uuid references tabel_tpk(id);
  alter table tabel_tarif            add column if not exists tpk_id uuid references tabel_tpk(id);
  alter table tabel_tenaga_kerja     add column if not exists tpk_id uuid references tabel_tpk(id);
  alter table tabel_dkhp_skshhk      add column if not exists tpk_id uuid references tabel_tpk(id);
  alter table tabel_register_kapling add column if not exists tpk_id uuid references tabel_tpk(id);

  -- Root periode table
  alter table tabel_periode          add column if not exists tpk_id uuid references tabel_tpk(id);

  -- Tabel turunan (punya periode_id FK ke tabel_periode)
  alter table tabel_pekerjaan        add column if not exists tpk_id uuid references tabel_tpk(id);
  alter table tabel_tarif_periode    add column if not exists tpk_id uuid references tabel_tpk(id);
  alter table tabel_tumpuk_kapling   add column if not exists tpk_id uuid references tabel_tpk(id);
  alter table tabel_tumpuk_brongkol  add column if not exists tpk_id uuid references tabel_tpk(id);
  alter table tabel_tanda_laku       add column if not exists tpk_id uuid references tabel_tpk(id);
  alter table tabel_pemasangan_barcode add column if not exists tpk_id uuid references tabel_tpk(id);
  alter table tabel_tenaga_bantu     add column if not exists tpk_id uuid references tabel_tpk(id);
  alter table tabel_kebersihan       add column if not exists tpk_id uuid references tabel_tpk(id);
  alter table tabel_listrik          add column if not exists tpk_id uuid references tabel_tpk(id);
  alter table tabel_custom_item      add column if not exists tpk_id uuid references tabel_tpk(id);

  -- ============================================================
  -- 5. Backfill: semua data lama → TPK Wongsorejo
  -- ============================================================

  -- Root tables
  update tabel_pejabat          set tpk_id = v_tpk_id where tpk_id is null;
  update tabel_tarif             set tpk_id = v_tpk_id where tpk_id is null;
  update tabel_tenaga_kerja      set tpk_id = v_tpk_id where tpk_id is null;
  update tabel_dkhp_skshhk       set tpk_id = v_tpk_id where tpk_id is null;
  update tabel_register_kapling  set tpk_id = v_tpk_id where tpk_id is null;
  update tabel_periode           set tpk_id = v_tpk_id where tpk_id is null;

  -- Tabel turunan: ambil tpk_id dari tabel_periode via JOIN
  update tabel_pekerjaan t
    set tpk_id = p.tpk_id
    from tabel_periode p
    where t.periode_id = p.id and t.tpk_id is null;

  update tabel_tarif_periode t
    set tpk_id = p.tpk_id
    from tabel_periode p
    where t.periode_id = p.id and t.tpk_id is null;

  update tabel_tumpuk_kapling t
    set tpk_id = p.tpk_id
    from tabel_periode p
    where t.periode_id = p.id and t.tpk_id is null;

  update tabel_tumpuk_brongkol t
    set tpk_id = p.tpk_id
    from tabel_periode p
    where t.periode_id = p.id and t.tpk_id is null;

  update tabel_tanda_laku t
    set tpk_id = p.tpk_id
    from tabel_periode p
    where t.periode_id = p.id and t.tpk_id is null;

  update tabel_pemasangan_barcode t
    set tpk_id = p.tpk_id
    from tabel_periode p
    where t.periode_id = p.id and t.tpk_id is null;

  update tabel_tenaga_bantu t
    set tpk_id = p.tpk_id
    from tabel_periode p
    where t.periode_id = p.id and t.tpk_id is null;

  update tabel_kebersihan t
    set tpk_id = p.tpk_id
    from tabel_periode p
    where t.periode_id = p.id and t.tpk_id is null;

  update tabel_listrik t
    set tpk_id = p.tpk_id
    from tabel_periode p
    where t.periode_id = p.id and t.tpk_id is null;

  update tabel_custom_item t
    set tpk_id = p.tpk_id
    from tabel_periode p
    where t.periode_id = p.id and t.tpk_id is null;

  -- ============================================================
  -- 6. Set NOT NULL setelah backfill selesai
  -- ============================================================
  alter table tabel_pejabat            alter column tpk_id set not null;
  alter table tabel_tarif              alter column tpk_id set not null;
  alter table tabel_tenaga_kerja       alter column tpk_id set not null;
  alter table tabel_dkhp_skshhk        alter column tpk_id set not null;
  alter table tabel_register_kapling   alter column tpk_id set not null;
  alter table tabel_periode            alter column tpk_id set not null;
  alter table tabel_pekerjaan          alter column tpk_id set not null;
  alter table tabel_tarif_periode      alter column tpk_id set not null;
  alter table tabel_tumpuk_kapling     alter column tpk_id set not null;
  alter table tabel_tumpuk_brongkol    alter column tpk_id set not null;
  alter table tabel_tanda_laku         alter column tpk_id set not null;
  alter table tabel_pemasangan_barcode alter column tpk_id set not null;
  alter table tabel_tenaga_bantu       alter column tpk_id set not null;
  alter table tabel_kebersihan         alter column tpk_id set not null;
  alter table tabel_listrik            alter column tpk_id set not null;
  alter table tabel_custom_item        alter column tpk_id set not null;

end $$;

-- ============================================================
-- 7. Index performa
-- ============================================================
create index if not exists idx_tpk_pejabat          on tabel_pejabat(tpk_id);
create index if not exists idx_tpk_tarif            on tabel_tarif(tpk_id);
create index if not exists idx_tpk_tenaga_kerja     on tabel_tenaga_kerja(tpk_id);
create index if not exists idx_tpk_dkhp_skshhk      on tabel_dkhp_skshhk(tpk_id);
create index if not exists idx_tpk_register_kapling on tabel_register_kapling(tpk_id);
create index if not exists idx_tpk_periode          on tabel_periode(tpk_id);
create index if not exists idx_tpk_pekerjaan        on tabel_pekerjaan(tpk_id);
create index if not exists idx_tpk_tarif_periode    on tabel_tarif_periode(tpk_id);
create index if not exists idx_tpk_tumpuk_kapling   on tabel_tumpuk_kapling(tpk_id);
create index if not exists idx_tpk_tumpuk_brongkol  on tabel_tumpuk_brongkol(tpk_id);
create index if not exists idx_tpk_tanda_laku       on tabel_tanda_laku(tpk_id);
create index if not exists idx_tpk_barcode          on tabel_pemasangan_barcode(tpk_id);
create index if not exists idx_tpk_tenaga_bantu     on tabel_tenaga_bantu(tpk_id);
create index if not exists idx_tpk_kebersihan       on tabel_kebersihan(tpk_id);
create index if not exists idx_tpk_listrik          on tabel_listrik(tpk_id);
create index if not exists idx_tpk_custom_item      on tabel_custom_item(tpk_id);

-- Fix unique index tabel_tenaga_kerja: NIK unik per TPK (bukan global)
drop index if exists uq_tenaga_kerja_nik;
create unique index if not exists uq_tenaga_kerja_nik_per_tpk
  on tabel_tenaga_kerja(tpk_id, nik) where nik is not null and nik <> '';

-- ============================================================
-- 8. Helper functions untuk RLS
-- ============================================================
create or replace function is_admin()
returns boolean
language sql
security definer
stable
as $$
  select coalesce(
    (select role = 'admin' from profiles where id = auth.uid()),
    false
  )
$$;

create or replace function my_tpk_id()
returns uuid
language sql
security definer
stable
as $$
  select tpk_id from profiles where id = auth.uid()
$$;

-- ============================================================
-- 9. Row Level Security
-- ============================================================

-- tabel_tpk: semua user bisa baca (untuk tampilkan nama TPK),
-- hanya admin yang bisa tulis
alter table tabel_tpk enable row level security;
create policy "tpk_select" on tabel_tpk for select using (true);
create policy "tpk_insert" on tabel_tpk for insert with check (is_admin());
create policy "tpk_update" on tabel_tpk for update using (is_admin());
create policy "tpk_delete" on tabel_tpk for delete using (is_admin());

-- profiles: user hanya bisa lihat & edit profil sendiri; admin bisa semua
alter table profiles enable row level security;
create policy "profiles_select" on profiles for select using (id = auth.uid() or is_admin());
create policy "profiles_insert" on profiles for insert with check (is_admin());
create policy "profiles_update" on profiles for update using (id = auth.uid() or is_admin());
create policy "profiles_delete" on profiles for delete using (is_admin());

-- Macro: buat RLS untuk tabel operasional (operator hanya akses TPK sendiri)
do $$
declare
  t text;
  tables text[] := array[
    'tabel_pejabat', 'tabel_tarif', 'tabel_tenaga_kerja',
    'tabel_dkhp_skshhk', 'tabel_register_kapling',
    'tabel_periode', 'tabel_pekerjaan', 'tabel_tarif_periode',
    'tabel_tumpuk_kapling', 'tabel_tumpuk_brongkol', 'tabel_tanda_laku',
    'tabel_pemasangan_barcode', 'tabel_tenaga_bantu',
    'tabel_kebersihan', 'tabel_listrik', 'tabel_custom_item'
  ];
begin
  foreach t in array tables loop
    execute format('alter table %I enable row level security', t);
    execute format('
      create policy "rls_%s_all" on %I for all
      using (tpk_id = my_tpk_id() or is_admin())
      with check (tpk_id = my_tpk_id() or is_admin())
    ', t, t);
  end loop;
end $$;
