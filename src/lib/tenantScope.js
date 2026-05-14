export function buildKaplingTenantKey(tpkId, noKapling) {
  return `${String(tpkId || '').trim()}::${String(noKapling || '').trim()}`
}

export function requireTpkId(tpkId) {
  const value = String(tpkId || '').trim()
  if (!value) throw new Error('Profil TPK tidak ditemukan. Coba login ulang.')
  return value
}

export function buildInvoiceKaplingUpdates({ tpkId, invoices }) {
  if (!tpkId) throw new Error('TPK aktif tidak ditemukan.')

  const updatesByKey = new Map()

  for (const invoice of invoices || []) {
    for (const row of invoice.matched || []) {
      if (row.tpk_id !== tpkId) {
        throw new Error('Data kapling tidak sesuai dengan TPK aktif.')
      }

      updatesByKey.set(buildKaplingTenantKey(tpkId, row.no_kapling), {
        id: row.id,
        tpk_id: tpkId,
        no_kapling: row.no_kapling,
        no_invois: invoice.noInvois,
        pembeli: invoice.pembeli,
      })
    }
  }

  return [...updatesByKey.values()]
}
