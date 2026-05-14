create or replace function seed_tumpuk_kapling(p_periode_id uuid)
returns void as $$
declare
  v_tpk_id uuid;
begin
  select tpk_id into v_tpk_id from tabel_periode where id = p_periode_id;

  insert into tabel_tumpuk_kapling (periode_id, tpk_id, jenis, sortimen, volume, tarif) values
    (p_periode_id, v_tpk_id, 'JATI',           'AI',   0, 19000),
    (p_periode_id, v_tpk_id, 'JATI',           'AII',  0, 21500),
    (p_periode_id, v_tpk_id, 'JATI',           'AIII', 0, 24800),
    (p_periode_id, v_tpk_id, 'RIMBA_MAHONI',   'AI',   0, 19000),
    (p_periode_id, v_tpk_id, 'RIMBA_MAHONI',   'AII',  0, 21500),
    (p_periode_id, v_tpk_id, 'RIMBA_MAHONI',   'AIII', 0, 24800),
    (p_periode_id, v_tpk_id, 'RIMBA_KEDAWUNG', 'AI',   0, 19000),
    (p_periode_id, v_tpk_id, 'RIMBA_KEDAWUNG', 'AII',  0, 21500),
    (p_periode_id, v_tpk_id, 'RIMBA_KEDAWUNG', 'AIII', 0, 24800)
  on conflict (periode_id, jenis, sortimen) do nothing;
end;
$$ language plpgsql;

create or replace function seed_tarif_periode(p_periode_id uuid)
returns void as $$
declare
  v_tpk_id uuid;
begin
  select tpk_id into v_tpk_id from tabel_periode where id = p_periode_id;

  insert into tabel_tarif_periode (periode_id, tpk_id, kode, kode_rek, uraian, satuan, tarif) values
    (p_periode_id, v_tpk_id, 'penomoran', '51.69.43', 'PENOMORAN KAPLING',   'M3',  900),
    (p_periode_id, v_tpk_id, 'sabuk',     '51.69.43', 'SABUK KAPLING',       'M3',  400),
    (p_periode_id, v_tpk_id, 'tanda_laku','51.69.43', 'TANDA LAKU',          'M3',  750),
    (p_periode_id, v_tpk_id, 'slaghammer','51.69.43', 'SLAGHAMMER',          'M3',  3000),
    (p_periode_id, v_tpk_id, 'barcode',   '51.69.44', 'PEMASANGAN BARCODE',  'BTG', 350),
    (p_periode_id, v_tpk_id, 'brongkol',  '51.69.44', 'TUMPUK BRONGKOL',     'SM',  7000)
  on conflict (periode_id, kode) do nothing;
end;
$$ language plpgsql;

create or replace function seed_kebersihan_if_periode_2(p_periode_id uuid)
returns void as $$
declare
  v_tpk_id uuid;
begin
  if periode_half(p_periode_id) = 'II' then
    select tpk_id into v_tpk_id from tabel_periode where id = p_periode_id;

    insert into tabel_kebersihan (periode_id, tpk_id, nominal)
    values (p_periode_id, v_tpk_id, 52000)
    on conflict (periode_id) do nothing;
  end if;
end;
$$ language plpgsql;
