# Shared Responsive Kit + Dashboard Mobile — Design

Tanggal: 2026-07-16
Status: disetujui user

## Tujuan

Semua halaman utama Deskra bisa dipakai di mobile/laptop layar kecil, dikerjakan bertahap
memakai satu kit bersama. Tahap pertama: kit + Dashboard. Tema tetap "dark terminal"
(`#0a0a0a`, aksen `#00ff88`, monospace, border tipis, radius 3px). Desktop tidak berubah.

## Keputusan desain (dari diskusi)

- Cakupan akhir: semua halaman utama (Dashboard → DkhpSkshhk → Database → DK-310 →
  MainLink/DetailPekerjaan/TumpukKapling → sisanya).
- Pola tabel besar di mobile: **card list** ("data ticket"), bukan horizontal scroll.
- Pendekatan: **A — shared responsive kit**, bukan duplikasi per halaman.
- Breakpoint mengikuti yang sudah ada: 768px (mobile) dan 480px (phone).

## Komponen kit

| File | Isi |
|------|-----|
| `src/lib/hooks/useIsMobile.js` | Hook `matchMedia('(max-width: 768px)')` — di-extract dari Layout.jsx; Layout ikut pakai. |
| `src/components/ui/responsive/AppResponsiveStyles.jsx` | `<style>` global (dipasang di Layout) berisi util class prefix `ds-`: `.ds-page`, `.ds-card-list`, `.ds-data-card`, `.ds-card-grid`, `.ds-hide-mobile`, `.ds-only-mobile`. |
| `src/components/ui/responsive/DataCard.jsx` | Kartu pengganti baris tabel di mobile. Props: `title`, `badge`, `fields` (`{label, value}[]`), `right`, `onClick`. |
| `src/components/ui/responsive/BottomSheet.jsx` | Panel slide-up + backdrop untuk filter/aksi. Dibuat sekarang, dipakai mulai halaman DkhpSkshhk. |

## Dashboard mobile

- Padding halaman 24px → 12px di ≤480px (`.ds-page`).
- Kartu jam full-width di phone, jam & tanggal horizontal.
- Grid statistik `minmax(320px,1fr)` → `minmax(280px,1fr)`; layout internal kartu
  "Total Kapling" jadi stack vertikal di ≤480px.
- Tabel History Uang Kerja → list `DataCard` di ≤768px (periode + badge status,
  tanggal kecil, Total UK hijau di kanan). Desktop tetap tabel.
- Ornamen background dikecilkan di phone.

## Non-goals

- Tidak ada library baru, tidak ada TypeScript, tidak mengubah tampilan desktop.
