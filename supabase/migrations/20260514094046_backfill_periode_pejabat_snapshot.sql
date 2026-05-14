with snapshots as (
  select
    p.id,
    jsonb_build_object(
      'version', 1,
      'captured_at', to_jsonb(now()),
      'roles', jsonb_build_object(
        'pengguna_anggaran', (
          select to_jsonb(x) from (
            select id, nama, npk, jabatan, tpk_id
            from public.tabel_pejabat pj
            where pj.tpk_id = p.tpk_id
              and pj.aktif = true
              and pj.jabatan ilike '%administratur utama%'
              and pj.jabatan not ilike '%wakil%'
              and pj.jabatan not ilike '%waka%'
            order by jabatan
            limit 1
          ) x
        ),
        'waka_administratur', (
          select to_jsonb(x) from (
            select id, nama, npk, jabatan, tpk_id
            from public.tabel_pejabat pj
            where pj.tpk_id = p.tpk_id
              and pj.aktif = true
              and (pj.jabatan ilike '%wakil administratur%' or pj.jabatan ilike '%waka administratur%')
            order by jabatan
            limit 1
          ) x
        ),
        'wakil_adm', (
          select to_jsonb(x) from (
            select id, nama, npk, jabatan, tpk_id
            from public.tabel_pejabat pj
            where pj.tpk_id = p.tpk_id
              and pj.aktif = true
              and (pj.jabatan ilike '%wakil administratur%' or pj.jabatan ilike '%waka administratur%')
            order by jabatan
            limit 1
          ) x
        ),
        'bendahara_umum', (
          select to_jsonb(x) from (
            select id, nama, npk, jabatan, tpk_id
            from public.tabel_pejabat pj
            where pj.tpk_id = p.tpk_id
              and pj.aktif = true
              and pj.jabatan ilike '%bendahara umum%'
            order by jabatan
            limit 1
          ) x
        ),
        'bendahara_pengeluaran', (
          select to_jsonb(x) from (
            select id, nama, npk, jabatan, tpk_id
            from public.tabel_pejabat pj
            where pj.tpk_id = p.tpk_id
              and pj.aktif = true
              and (pj.jabatan ilike '%kepala tpk%' or pj.jabatan ilike '%bendahara pengeluaran%')
            order by jabatan
            limit 1
          ) x
        ),
        'kepala_tpk', (
          select to_jsonb(x) from (
            select id, nama, npk, jabatan, tpk_id
            from public.tabel_pejabat pj
            where pj.tpk_id = p.tpk_id
              and pj.aktif = true
              and (pj.jabatan ilike '%kepala tpk%' or pj.jabatan ilike '%bendahara pengeluaran%')
            order by jabatan
            limit 1
          ) x
        ),
        'pelaksana', (
          select to_jsonb(x) from (
            select id, nama, npk, jabatan, tpk_id
            from public.tabel_pejabat pj
            where pj.tpk_id = p.tpk_id
              and pj.aktif = true
              and pj.jabatan ilike '%pelaksana%'
            order by jabatan
            limit 1
          ) x
        ),
        'tu_tpk', (
          select to_jsonb(x) from (
            select id, nama, npk, jabatan, tpk_id
            from public.tabel_pejabat pj
            where pj.tpk_id = p.tpk_id
              and pj.aktif = true
              and (pj.jabatan ilike '%tu tpk%' or pj.jabatan ilike '%sp tpk%' or pj.jabatan ilike '%sp.tpk%')
            order by jabatan
            limit 1
          ) x
        )
      )
    ) as snapshot
  from public.tabel_periode p
  where p.pejabat_snapshot is null
)
update public.tabel_periode p
set pejabat_snapshot = snapshots.snapshot
from snapshots
where p.id = snapshots.id;
