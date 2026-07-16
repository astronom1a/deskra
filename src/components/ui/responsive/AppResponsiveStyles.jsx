// Util class responsif global (prefix ds-) — dipasang sekali di Layout.
// Breakpoint: 768px (mobile) & 480px (phone), samakan dengan useIsMobile.
export default function AppResponsiveStyles() {
  return (
    <style>{`
      /* ── Halaman ── */
      .ds-page { padding: 24px; }

      /* ── Card list (pengganti baris tabel di mobile) ── */
      .ds-card-list { display: flex; flex-direction: column; gap: 8px; }
      .ds-data-card {
        background: rgba(255,255,255,0.025);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 3px;
        padding: 12px 14px;
        font-family: monospace;
      }
      .ds-data-card:active { background: rgba(255,255,255,0.045); }
      .ds-card-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px 12px;
        margin-top: 10px;
      }
      .ds-card-label {
        font-size: 9px;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: rgba(255,255,255,0.25);
        margin-bottom: 2px;
      }
      .ds-card-value { font-size: 12px; color: rgba(255,255,255,0.75); }

      /* ── Visibilitas per breakpoint ── */
      .ds-only-mobile { display: none; }

      @media (max-width: 768px) {
        .ds-hide-mobile { display: none !important; }
        .ds-only-mobile { display: block; }
        .ds-page { min-height: calc(100vh - 48px); }
      }
      @media (max-width: 480px) {
        .ds-page { padding: 12px; }
      }
    `}</style>
  )
}
