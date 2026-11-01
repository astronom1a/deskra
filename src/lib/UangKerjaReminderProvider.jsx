import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from './supabase'
import { useAuth } from './AuthProvider'
import { getEffectiveTpkId } from './effectiveTpk'
import { getPeriodeWindow, getPeriodeSebelumnya, getStatusPeriode } from './periodeBerjalan'
import { computeTotalUK } from './rekapPekerjaan'

const UangKerjaReminderContext = createContext(null)

const INITIAL = {
  empty: false, current: null, previous: 'none', hariTersisa: null, reminderAktif: false,
  window: null, windowSebelumnya: null, totalUk: 0, totalUkSebelumnya: 0,
}

export function UangKerjaReminderProvider({ children }) {
  const { profile, activeTpkId } = useAuth()
  const tpkId = getEffectiveTpkId({ activeTpkId, profile })
  const [info, setInfo] = useState(INITIAL)
  const [nonce, setNonce] = useState(0)

  const refresh = useCallback(() => setNonce(n => n + 1), [])

  useEffect(() => {
    if (!tpkId) { setInfo(INITIAL); return }

    let cancelled = false

    async function load() {
      try {
        const window = getPeriodeWindow(new Date())
        const windowSebelumnya = getPeriodeSebelumnya(window)

        const { count } = await supabase
          .from('tabel_periode')
          .select('id', { count: 'exact', head: true })
          .eq('tpk_id', tpkId)
        if (cancelled) return
        if (!count) { setInfo({ ...INITIAL, empty: true, window, windowSebelumnya }); return }

        const { data: rows } = await supabase
          .from('tabel_periode')
          .select('id, periode, tgl_awal, tgl_akhir')
          .eq('tpk_id', tpkId)
          .in('tgl_awal', [window.tglAwal, windowSebelumnya.tglAwal])
        if (cancelled) return

        const matchWindow = (w) =>
          rows?.find(r => r.tgl_awal === w.tglAwal) ?? rows?.find(r => !r.tgl_awal && r.periode === w.label)
        const periodeRow = matchWindow(window)
        const periodeRowSebelumnya = matchWindow(windowSebelumnya)

        const [totalUk, totalUkSebelumnya] = await Promise.all([
          periodeRow ? computeTotalUK(periodeRow.id, periodeRow.periode, { tpkId }) : Promise.resolve(0),
          periodeRowSebelumnya ? computeTotalUK(periodeRowSebelumnya.id, periodeRowSebelumnya.periode, { tpkId }) : Promise.resolve(0),
        ])
        if (cancelled) return

        const status = getStatusPeriode({ window, periodeRow, totalUk, periodeRowSebelumnya, totalUkSebelumnya })
        setInfo({ ...status, window, windowSebelumnya, totalUk, totalUkSebelumnya })
      } catch (err) {
        if (cancelled) return
        console.error('UangKerjaReminderProvider:', err.message)
        setInfo(INITIAL)
      }
    }

    load()
    return () => { cancelled = true }
  }, [tpkId, nonce])

  return (
    <UangKerjaReminderContext.Provider value={{ ...info, refresh }}>
      {children}
    </UangKerjaReminderContext.Provider>
  )
}

export function useUangKerjaReminder() {
  return useContext(UangKerjaReminderContext) ?? { ...INITIAL, refresh: () => {} }
}
