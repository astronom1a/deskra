# Changelog Notification — Login Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tambahkan badge pill `✦ v0.31.0` di pojok kanan atas halaman Login yang membuka popup changelog saat diklik.

**Architecture:** Buat file data `src/changelog.js` terpisah, lalu edit `Login.jsx` untuk menambah badge dan popup dengan click-outside handler. Footer diubah: versi dihapus, copyright dipusatkan.

**Tech Stack:** React 18, inline styles (konsisten dengan pola Login.jsx yang ada), Lucide tidak dipakai untuk fitur ini.

---

## File Map

| File | Aksi |
|------|------|
| `src/changelog.js` | Buat baru — data changelog |
| `src/pages/Login.jsx` | Edit — badge, popup, footer |

---

### Task 1: Buat `src/changelog.js`

**Files:**
- Create: `src/changelog.js`

- [ ] **Step 1: Buat file changelog**

Buat file `src/changelog.js` dengan isi berikut:

```js
// Tambah entry baru di awal array setiap rilis
export const changelog = [
  {
    version: '0.31.0',
    items: [
      { type: 'feat', text: 'Import DKHP dari Excel (.xlsx)' },
      { type: 'feat', text: 'Register Kapling: sort panel & batch edit' },
      { type: 'feat', text: 'Invoice preview & fix prefix modal' },
      { type: 'fix',  text: 'Parser DK310 & DKHP' },
    ]
  },
]

export const latestChangelog = changelog[0]
```

- [ ] **Step 2: Commit**

```bash
git add src/changelog.js
git commit -m "feat: add changelog data file"
```

---

### Task 2: Edit `Login.jsx` — state, ref, dan click-outside

**Files:**
- Modify: `src/pages/Login.jsx`

- [ ] **Step 1: Tambah import dan state baru**

Di bagian atas file `src/pages/Login.jsx`, tambah import `latestChangelog`:

```js
import { latestChangelog } from '../changelog'
```

Import `appVersion` sudah ada — tidak perlu ditambah lagi:
```js
import { version as appVersion } from '../../package.json'  // sudah ada
```

- [ ] **Step 2: Tambah state dan ref untuk popup**

Di dalam komponen `Login()`, setelah deklarasi state yang sudah ada, tambah:

```js
const [showChangelog, setShowChangelog] = useState(false)
const changelogRef = useRef(null)
```

`useRef` sudah diimport (`rootRef` sudah pakai) — tidak perlu import ulang.

- [ ] **Step 3: Tambah useEffect click-outside handler**

Tambah `useEffect` baru setelah `useEffect` GSAP yang sudah ada:

```js
useEffect(() => {
  if (!showChangelog) return
  const handleClickOutside = (e) => {
    if (changelogRef.current && !changelogRef.current.contains(e.target)) {
      setShowChangelog(false)
    }
  }
  document.addEventListener('mousedown', handleClickOutside)
  return () => document.removeEventListener('mousedown', handleClickOutside)
}, [showChangelog])
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/Login.jsx
git commit -m "feat: add showChangelog state and click-outside handler to Login"
```

---

### Task 3: Edit `Login.jsx` — tambah badge pill dan popup

**Files:**
- Modify: `src/pages/Login.jsx`

- [ ] **Step 1: Tambah CSS keyframe untuk animasi pulse badge**

Di dalam blok `<style>` yang sudah ada di render (cari string `@keyframes geo-pulse`), tambahkan keyframe baru setelah keyframe yang sudah ada:

```css
@keyframes badge-glow {
  0%,100% { box-shadow: 0 0 0 0 rgba(0,255,136,0.2); }
  50%      { box-shadow: 0 0 0 4px rgba(0,255,136,0); }
}
```

- [ ] **Step 2: Tambah badge pill dan popup di JSX**

Di dalam `<div className="relative z-10 w-full max-w-sm">`, tambahkan badge dan popup tepat sebelum blok `{/* Brand */}`:

```jsx
{/* Changelog badge */}
<div ref={changelogRef} style={{ position: 'absolute', top: 0, right: 0, zIndex: 40 }}>
  <button
    onClick={() => setShowChangelog(v => !v)}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      background: showChangelog ? 'rgba(0,255,136,0.14)' : 'rgba(0,255,136,0.08)',
      border: '1px solid rgba(0,255,136,0.22)',
      borderRadius: 20,
      padding: '5px 10px 5px 8px',
      fontSize: 10,
      color: '#00ff88',
      cursor: 'pointer',
      whiteSpace: 'nowrap',
      fontFamily: 'inherit',
      animation: showChangelog ? 'none' : 'badge-glow 2.5s ease-in-out infinite',
    }}
  >
    <span style={{ fontSize: 11 }}>✦</span>
    <span style={{ fontSize: 9, opacity: 0.75 }}>v{appVersion}</span>
  </button>

  {showChangelog && (
    <div style={{
      position: 'absolute',
      top: 38,
      right: 0,
      width: 220,
      background: '#141414',
      border: '1px solid rgba(0,255,136,0.18)',
      borderRadius: 6,
      padding: 14,
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
    }}>
      {/* Popup header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 9, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#00ff88' }}>
          What's new
        </span>
        <span style={{
          fontSize: 8,
          background: 'rgba(0,255,136,0.1)',
          border: '1px solid rgba(0,255,136,0.2)',
          color: '#00ff88',
          padding: '2px 7px',
          borderRadius: 10,
        }}>
          v{appVersion}
        </span>
      </div>

      {/* Popup items */}
      {latestChangelog.items.map((item, i) => (
        <div key={i} style={{
          display: 'flex',
          gap: 7,
          alignItems: 'flex-start',
          padding: '5px 0',
          borderBottom: i < latestChangelog.items.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
          fontSize: 10,
          color: 'rgba(255,255,255,0.6)',
          lineHeight: 1.4,
        }}>
          <span style={{
            flexShrink: 0,
            fontWeight: 700,
            width: 12,
            textAlign: 'center',
            color: item.type === 'feat' ? '#00ff88' : 'rgba(255,255,255,0.3)',
          }}>
            {item.type === 'feat' ? '+' : '✦'}
          </span>
          <span>
            {item.text}
            {item.type === 'fix' && (
              <span style={{
                display: 'inline-block',
                fontSize: 8,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.35)',
                padding: '0 4px',
                borderRadius: 2,
                marginLeft: 4,
                verticalAlign: 'middle',
                letterSpacing: '0.5px',
              }}>
                FIX
              </span>
            )}
          </span>
        </div>
      ))}
    </div>
  )}
</div>
```

- [ ] **Step 3: Verifikasi posisi badge di JSX**

Pastikan struktur di dalam `<div className="relative z-10 w-full max-w-sm">` urut seperti ini:

```
<div className="relative z-10 w-full max-w-sm">
  {/* Changelog badge */}     ← baru ditambah
  {/* Brand */}
  {/* Card */}
  {/* Footer */}
</div>
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/Login.jsx
git commit -m "feat: add changelog badge pill and popup to Login page"
```

---

### Task 4: Edit `Login.jsx` — update footer

**Files:**
- Modify: `src/pages/Login.jsx`

- [ ] **Step 1: Ganti footer**

Cari blok footer yang sekarang berbunyi:

```jsx
<div className="mt-6 flex items-center justify-between">
  <p className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.15)' }}>
    v{appVersion}
  </p>
  <p className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.15)' }}>
    ©{' '}
    <a
      href="https://astrolabs.site"
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: 'rgba(0,255,136,0.35)', transition: 'color 0.2s' }}
      onMouseEnter={e => { e.currentTarget.style.color = '#00ff88' }}
      onMouseLeave={e => { e.currentTarget.style.color = 'rgba(0,255,136,0.35)' }}
    >
      AstroLabs Studio
    </a>
  </p>
</div>
```

Ganti seluruh blok tersebut dengan:

```jsx
<div className="mt-6 text-center">
  <p className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.15)' }}>
    ©{' '}
    <a
      href="https://astrolabs.site"
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: 'rgba(0,255,136,0.35)', transition: 'color 0.2s' }}
      onMouseEnter={e => { e.currentTarget.style.color = '#00ff88' }}
      onMouseLeave={e => { e.currentTarget.style.color = 'rgba(0,255,136,0.35)' }}
    >
      AstroLabs Studio
    </a>
  </p>
</div>
```

- [ ] **Step 2: Verifikasi `appVersion` masih dipakai**

Import `appVersion` tetap dibutuhkan untuk badge. Pastikan baris ini masih ada di bagian atas file:

```js
import { version as appVersion } from '../../package.json'
```

- [ ] **Step 3: Test manual di browser**

Jalankan dev server:
```bash
npm run dev
```

Checklist verifikasi:
- [ ] Badge `✦ v0.31.0` muncul di pojok kanan atas
- [ ] Badge berpulse (glow animation) saat tidak diklik
- [ ] Klik badge → popup muncul, animasi berhenti
- [ ] Item `feat` punya ikon `+` hijau
- [ ] Item `fix` punya ikon `✦` abu + label `FIX` kecil
- [ ] Klik di luar popup → popup tutup
- [ ] Footer hanya tampilkan `© AstroLabs Studio` di tengah
- [ ] Versi tidak muncul lagi di footer

- [ ] **Step 4: Commit**

```bash
git add src/pages/Login.jsx
git commit -m "feat: update Login footer — remove version, center copyright"
```
