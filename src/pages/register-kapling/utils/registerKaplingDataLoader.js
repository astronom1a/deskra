export const REGISTER_KAPLING_SELECT =
  'id,tpk_id,no_kapling,tgl_kapling,periode,no_blok,jenis,sortimen,sort_untuk,panjang,lebar,diameter_tebal,status,mutu,cacat,asal_kayu,sertifikasi,batang,volume,no_invois,pembeli,dkhp,skshhk,dkhp_conflict,file_name'

export async function fetchRegisterKaplingRows({ pageSize = 500, supabase, tpkId }) {
  const all = []
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('tabel_register_kapling')
      .select(REGISTER_KAPLING_SELECT)
      .eq('tpk_id', tpkId)
      .order('no_kapling', { ascending: true })
      .range(from, from + pageSize - 1)

    if (error) throw error
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < pageSize) break
  }
  return all
}

export async function fetchPenguranganInvoices({ supabase, tpkId }) {
  const { data: periods, error: periodsError } = await supabase
    .from('tabel_dk310_periods')
    .select('id')
    .eq('tpk_id', tpkId)
    .eq('jenis', 'pengurangan')

  if (periodsError) throw periodsError
  if (!periods || periods.length === 0) return []

  const { data: suratBuktiRows, error: suratBuktiError } = await supabase
    .from('tabel_dk310_surat_bukti')
    .select('nomor_surat')
    .in('period_id', periods.map(period => period.id))

  if (suratBuktiError) throw suratBuktiError
  return (suratBuktiRows || []).map(row => row.nomor_surat).filter(Boolean)
}
