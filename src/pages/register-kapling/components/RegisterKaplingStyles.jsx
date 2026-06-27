export default function RegisterKaplingStyles() {
  return (
    <style>{`
      .rk-input { background: rgba(255,255,255,0.03) !important; border: 1px solid rgba(255,255,255,0.1) !important; color: #f0f0f0 !important; border-radius: 3px; outline: none; font-family: monospace; font-size: 12px; color-scheme: dark; }
      .rk-input:focus { border-color: rgba(0,255,136,0.5) !important; box-shadow: 0 0 0 2px rgba(0,255,136,0.07); }
      .rk-input option { background: #111; color: #f0f0f0; font-family: monospace; }
      .rk-input option:hover,
      .rk-input option:focus,
      .rk-input option:checked {
        background: linear-gradient(0deg, rgba(0,255,136,0.18), rgba(0,255,136,0.18)), #111;
        color: #00ff88;
      }
      .rk-input::placeholder { color: rgba(255,255,255,0.2) !important; }
      .rk-input[type=number] { -moz-appearance: textfield; appearance: textfield; }
      .rk-input[type=number]::-webkit-inner-spin-button, .rk-input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
      .rk-row:hover td { background: rgba(255,255,255,0.025) !important; }
      .rk-row-sel td { background: rgba(0,255,136,0.05) !important; }
      .rk-th:hover { background: rgba(255,255,255,0.04) !important; }
      .rk-cb {
        appearance: none;
        -webkit-appearance: none;
        width: 14px;
        height: 14px;
        margin: 0;
        display: inline-grid;
        place-content: center;
        border-radius: 3px;
        border: 1px solid rgba(255,255,255,0.16);
        background: rgba(255,255,255,0.035);
        box-shadow: inset 0 0 0 1px rgba(0,0,0,0.18);
        vertical-align: middle;
        transition: background .16s ease, border-color .16s ease, box-shadow .16s ease, transform .16s ease;
      }
      .rk-cb::after {
        content: '';
        width: 7px;
        height: 4px;
        border-left: 2px solid #06130d;
        border-bottom: 2px solid #06130d;
        transform: rotate(-45deg) scale(0);
        transform-origin: center;
        margin-top: -1px;
        transition: transform .14s ease;
      }
      .rk-cb:hover {
        border-color: rgba(0,255,136,0.42);
        background: rgba(0,255,136,0.08);
        box-shadow: 0 0 0 2px rgba(0,255,136,0.06);
      }
      .rk-cb:checked {
        border-color: rgba(0,255,136,0.95);
        background: #00ff88;
        box-shadow: 0 0 12px rgba(0,255,136,0.28);
      }
      .rk-cb:checked::after {
        transform: rotate(-45deg) scale(1);
      }
      .rk-cb:indeterminate {
        border-color: rgba(0,255,136,0.85);
        background: rgba(0,255,136,0.16);
        box-shadow: 0 0 12px rgba(0,255,136,0.18);
      }
      .rk-cb:indeterminate::after {
        width: 8px;
        height: 2px;
        border: 0;
        border-radius: 999px;
        background: #00ff88;
        margin-top: 0;
        transform: scale(1);
      }
      .rk-cb:focus-visible {
        outline: none;
        box-shadow: 0 0 0 2px rgba(0,255,136,0.16), 0 0 12px rgba(0,255,136,0.24);
      }
      .rk-row:hover .rk-actions { opacity: 1 !important; }

      /* ── Responsive ── */
      .rk-metric-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 20px; }
      .rk-header-actions { display: flex; gap: 6px; flex-wrap: nowrap; }
      .rk-table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }

      @media (max-width: 768px) {
        .rk-metric-grid { grid-template-columns: repeat(2, 1fr); }
        .rk-header-actions { flex-wrap: wrap; }
        .rk-page { height: calc(100vh - 48px) !important; }
      }
      @media (max-width: 480px) {
        .rk-metric-grid { grid-template-columns: 1fr; }
        .rk-page { padding: 12px !important; }
      }
    `}</style>
  )
}
