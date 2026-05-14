import { supabase } from './supabase'
import { requireTpkId } from './tenantScope'
import {
  createPejabatSnapshot,
  getPejabatRolesFromSnapshot,
  selectPejabatRoles,
} from './pejabatSnapshotCore'

export {
  createPejabatSnapshot,
  getPejabatRolesFromSnapshot,
  selectPejabatRoles,
}

export async function fetchActivePejabatSnapshot(tpkId) {
  const scopedTpkId = requireTpkId(tpkId)
  const { data, error } = await supabase
    .from('tabel_pejabat')
    .select('id,nama,npk,jabatan,tpk_id')
    .eq('tpk_id', scopedTpkId)
    .eq('aktif', true)
    .order('jabatan')

  if (error) throw error
  return createPejabatSnapshot(data || [])
}

export async function refreshPeriodePejabatSnapshot(periodeId, tpkId) {
  const scopedTpkId = requireTpkId(tpkId)
  const snapshot = await fetchActivePejabatSnapshot(scopedTpkId)
  const { data, error } = await supabase
    .from('tabel_periode')
    .update({ pejabat_snapshot: snapshot })
    .eq('id', periodeId)
    .eq('tpk_id', scopedTpkId)
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function resolvePejabatForPeriode(periode) {
  const roles = getPejabatRolesFromSnapshot(periode?.pejabat_snapshot)
  if (Object.keys(roles).length) return roles

  const snapshot = await fetchActivePejabatSnapshot(periode?.tpk_id)
  return getPejabatRolesFromSnapshot(snapshot)
}
