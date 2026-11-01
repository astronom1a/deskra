import assert from 'node:assert/strict'
import test from 'node:test'

import { getPeriodeWindow, getPeriodeSebelumnya, hariTersisa, getStatusPeriode } from '../src/lib/periodeBerjalan.js'

test('getPeriodeWindow — paruh I dan paruh II', () => {
  assert.deepEqual(getPeriodeWindow(new Date(2026, 9, 10)), {
    half: 'I', bulan: 10, tahun: 2026, label: 'I/10 / 2026',
    tglAwal: '2026-10-01', tglAkhir: '2026-10-15',
  })
  assert.deepEqual(getPeriodeWindow(new Date(2026, 9, 20)), {
    half: 'II', bulan: 10, tahun: 2026, label: 'II/10 / 2026',
    tglAwal: '2026-10-16', tglAkhir: '2026-10-31',
  })
})

test('getPeriodeWindow — batas tanggal 15 dan 16', () => {
  assert.equal(getPeriodeWindow(new Date(2026, 9, 15)).half, 'I')
  assert.equal(getPeriodeWindow(new Date(2026, 9, 16)).half, 'II')
})

test('getPeriodeWindow — akhir bulan 28/29/30/31', () => {
  assert.equal(getPeriodeWindow(new Date(2026, 3, 20)).tglAkhir, '2026-04-30') // April
  assert.equal(getPeriodeWindow(new Date(2026, 0, 20)).tglAkhir, '2026-01-31') // Januari
  assert.equal(getPeriodeWindow(new Date(2026, 1, 20)).tglAkhir, '2026-02-28') // Februari non-kabisat
  assert.equal(getPeriodeWindow(new Date(2028, 1, 20)).tglAkhir, '2028-02-29') // Februari kabisat
})

test('getPeriodeSebelumnya — paruh II mundur ke paruh I bulan sama', () => {
  const window = getPeriodeWindow(new Date(2026, 9, 20)) // II/10
  assert.equal(getPeriodeSebelumnya(window).label, 'I/10 / 2026')
})

test('getPeriodeSebelumnya — paruh I mundur ke paruh II bulan sebelumnya', () => {
  const window = getPeriodeWindow(new Date(2026, 9, 10)) // I/10
  assert.equal(getPeriodeSebelumnya(window).label, 'II/9 / 2026')
})

test('getPeriodeSebelumnya — melintasi pergantian tahun', () => {
  const window = getPeriodeWindow(new Date(2026, 0, 10)) // I/1/2026
  assert.equal(getPeriodeSebelumnya(window).label, 'II/12 / 2025')
})

test('hariTersisa — H-3, H-1, H-0', () => {
  assert.equal(hariTersisa('2026-10-31', new Date(2026, 9, 28)), 3)
  assert.equal(hariTersisa('2026-10-31', new Date(2026, 9, 30)), 1)
  assert.equal(hariTersisa('2026-10-31', new Date(2026, 9, 31)), 0)
})

test('getStatusPeriode — cabang current: missing, noData, onTrack', () => {
  const window = getPeriodeWindow(new Date(2026, 9, 20))
  const base = { window, periodeRowSebelumnya: { id: 1 }, totalUkSebelumnya: 5000 }

  assert.equal(getStatusPeriode({ ...base, periodeRow: null, totalUk: 0 }).current, 'missing')
  assert.equal(getStatusPeriode({ ...base, periodeRow: { id: 2 }, totalUk: 0 }).current, 'noData')
  assert.equal(getStatusPeriode({ ...base, periodeRow: { id: 2 }, totalUk: 100 }).current, 'onTrack')
})

test('getStatusPeriode — cabang previous: archived, overdue, none', () => {
  const window = getPeriodeWindow(new Date(2026, 9, 20))
  const base = { window, periodeRow: { id: 2 }, totalUk: 100 }

  assert.equal(getStatusPeriode({ ...base, periodeRowSebelumnya: { id: 1 }, totalUkSebelumnya: 5000 }).previous, 'archived')
  assert.equal(getStatusPeriode({ ...base, periodeRowSebelumnya: null, totalUkSebelumnya: 0 }).previous, 'overdue')
  assert.equal(getStatusPeriode({ ...base, previousApplicable: false }).previous, 'none')
})

test('getStatusPeriode — flag empty menang atas kedua sumbu', () => {
  const window = getPeriodeWindow(new Date(2026, 9, 20))
  const status = getStatusPeriode({ window, periodeRow: { id: 1 }, totalUk: 999, empty: true })
  assert.equal(status.current, null)
  assert.equal(status.previous, 'none')
  assert.equal(status.reminderAktif, false)
})

test('getStatusPeriode — kombinasi overdue + missing bisa terjadi bersamaan', () => {
  const window = getPeriodeWindow(new Date(2026, 9, 20))
  const status = getStatusPeriode({
    window, periodeRow: null, totalUk: 0,
    periodeRowSebelumnya: null, totalUkSebelumnya: 0,
    today: new Date(2026, 9, 20),
  })
  assert.equal(status.current, 'missing')
  assert.equal(status.previous, 'overdue')
  assert.equal(status.reminderAktif, true)
})

test('getStatusPeriode — reminderAktif menyala pada overdue, padam pada onTrack/archived', () => {
  const window = getPeriodeWindow(new Date(2026, 9, 20)) // sisa 11 hari ke 31 Okt — di luar H-3
  const onTrackArchived = getStatusPeriode({
    window, periodeRow: { id: 2 }, totalUk: 100,
    periodeRowSebelumnya: { id: 1 }, totalUkSebelumnya: 5000,
    today: new Date(2026, 9, 20),
  })
  assert.equal(onTrackArchived.reminderAktif, false)

  const overdue = getStatusPeriode({
    window, periodeRow: { id: 2 }, totalUk: 100,
    periodeRowSebelumnya: null, totalUkSebelumnya: 0,
    today: new Date(2026, 9, 20),
  })
  assert.equal(overdue.reminderAktif, true)
})

test('getStatusPeriode — H-3 missing menyalakan reminder, H-4 tidak', () => {
  const window = getPeriodeWindow(new Date(2026, 9, 20)) // tglAkhir 2026-10-31
  const base = { window, periodeRow: null, totalUk: 0, periodeRowSebelumnya: { id: 1 }, totalUkSebelumnya: 5000 }

  assert.equal(getStatusPeriode({ ...base, today: new Date(2026, 9, 28) }).reminderAktif, true)  // H-3
  assert.equal(getStatusPeriode({ ...base, today: new Date(2026, 9, 27) }).reminderAktif, false) // H-4
})
