# Design: Changelog Notification — Login Page

**Date:** 2026-05-17
**Status:** Approved

---

## Overview

Tambahkan badge pill di pojok kanan atas halaman Login yang menampilkan versi aplikasi saat ini. Klik badge membuka popup dropdown berisi daftar update versi tersebut. Data changelog disimpan di file terpisah `src/changelog.js`.

---

## Visual Design

### Badge (default state)
- Posisi: `top: 14px; right: 14px` — absolut di dalam container halaman login, di luar card form
- Bentuk: pill (border-radius penuh), background `rgba(0,255,136,0.08)`, border `rgba(0,255,136,0.22)`
- Isi: ikon `✦` + teks versi, contoh: `✦ v0.31.0`
- Animasi: ring glow berpulse (`box-shadow`) tiap 2.5s, berhenti saat hover
- Warna teks: `#00ff88`

### Popup (setelah klik badge)
- Posisi: tepat di bawah badge (`top: 50px; right: 14px`)
- Lebar: 220px, background `#141414`, border `rgba(0,255,136,0.18)`, border-radius 6px
- Header: label "What's new" (kiri) + chip versi `v{appVersion}` (kanan) — pakai `appVersion` dari `package.json`, sumber kebenaran tunggal
- List item:
  - `feat` → ikon `+` warna hijau `#00ff88`
  - `fix` → ikon `✦` warna abu `rgba(255,255,255,0.3)` + label `FIX` kecil di ujung teks
- Tutup: klik di luar popup (click-outside handler)
- Tidak ada dismiss permanen — popup bisa dibuka tutup bebas setiap sesi

### Footer
- Hanya menampilkan `© AstroLabs Studio` di tengah (`text-align: center`)
- Versi **dihapus** dari footer — sudah pindah ke badge

---

## Data

### `src/changelog.js` (file baru)

```js
// Tambah entry baru di awal array setiap rilis
export const changelog = [
  {
    version: '0.31.0',
    items: [
      { type: 'feat', text: 'Import DKHP dari Excel (.xlsx)' },
      { type: 'feat', text: 'Register Kapling: sort panel & batch edit' },
      { type: 'fix',  text: 'Parser DK310 & DKHP' },
    ]
  },
]

export const latestChangelog = changelog[0]
```

- `type: 'feat'` → fitur baru (ikon `+`)
- `type: 'fix'` → perbaikan (ikon `✦` + label `FIX`)
- `changelog[0]` selalu dipakai sebagai entry terbaru — tambah object baru di depan array setiap rilis

---

## Perubahan File

| File | Aksi |
|------|------|
| `src/changelog.js` | Buat baru |
| `src/pages/Login.jsx` | Edit — tambah badge, popup, hapus versi di footer, pusatkan copyright |

### Perubahan di `Login.jsx`
1. Import `latestChangelog` dari `../changelog`
2. Tambah state `const [showChangelog, setShowChangelog] = useState(false)`
3. Tambah `useEffect` click-outside handler (ref ke popup element)
4. Tambah badge pill di luar card, di dalam container `relative z-10`
5. Render popup secara kondisional (`showChangelog && <popup>`)
6. Hapus `v{appVersion}` dari footer, pusatkan `© AstroLabs Studio`
7. Import `appVersion` tetap dipakai di badge (`✦ v{appVersion}`)

---

## Behavior

- Badge selalu tampil di halaman login tanpa exception
- Popup toggle on/off setiap klik badge
- Klik di luar popup menutupnya
- Tidak ada localStorage — tidak ada "sudah dibaca" state
- GSAP entrance animation yang sudah ada tidak perlu diubah (badge di luar area animasi card)
