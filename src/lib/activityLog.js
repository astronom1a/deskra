import { supabase } from './supabase'

export async function logActivity({
  action,
  entityType,
  entityId = null,
  entityLabel = null,
  diff = null,
  tpkId,
  profile,
}) {
  try {
    await supabase.from('tabel_activity_log').insert({
      tpk_id:        tpkId,
      user_id:       profile?.id ?? null,
      nama_operator: profile?.nama_operator ?? null,
      action,
      entity_type:   entityType,
      entity_id:     entityId ?? null,
      entity_label:  entityLabel ?? null,
      diff:          (Array.isArray(diff) && diff.length > 0) ? diff : null,
    })
  } catch (err) {
    console.warn('[activityLog] gagal catat log:', err)
  }
}

// Hanya field yang nilainya berubah; HTML tag di label dibersihkan.
export function buildDiff(oldObj, newObj, fieldDefs) {
  return fieldDefs
    .filter(({ key }) => String(oldObj[key] ?? '') !== String(newObj[key] ?? ''))
    .map(({ key, label }) => ({
      field:  key,
      label:  label.replace(/<[^>]+>/g, ''),
      before: oldObj[key] ?? null,
      after:  newObj[key] ?? null,
    }))
}
