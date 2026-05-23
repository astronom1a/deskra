import { useState } from 'react'
import { UserCog, Save, Check, AlertCircle, Mail } from 'lucide-react'
import { useAuth } from '../lib/AuthProvider'
import { supabase } from '../lib/supabase'

export default function Settings() {
  const { profile, tpk, updateProfile, session } = useAuth()

  const [namaOperator, setNamaOperator] = useState(profile?.nama_operator || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [resetSent, setResetSent] = useState(false)
  const [resetSending, setResetSending] = useState(false)

  async function handleResetPassword() {
    if (!session?.user?.email) return
    setResetSending(true)
    const { error } = await supabase.auth.resetPasswordForEmail(session.user.email)
    setResetSending(false)
    if (!error) setResetSent(true)
  }

  const dirty = namaOperator.trim() !== (profile?.nama_operator || '')
  const canSave = dirty && namaOperator.trim().length > 0 && !saving

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    setError('')
    const { error } = await updateProfile({ nama_operator: namaOperator.trim() })
    if (error) {
      setError(typeof error === 'string' ? error : error.message || 'Gagal menyimpan.')
    } else {
      setSaved(true)
    }
    setSaving(false)
  }

  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '8px 10px',
    borderRadius: 3,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.03)',
    color: '#f0f0f0',
    outline: 'none',
    fontFamily: 'monospace',
    fontSize: 12,
  }

  const disabledInputStyle = {
    ...inputStyle,
    background: 'rgba(255,255,255,0.025)',
    color: 'rgba(255,255,255,0.42)',
    cursor: 'not-allowed',
  }

  return (
    <div style={{ padding: 24, maxWidth: 760, minHeight: '100%', background: '#0a0a0a', color: '#f0f0f0' }}>
      <style>{`
        .settings-input:focus {
          border-color: rgba(0,255,136,0.5) !important;
          box-shadow: 0 0 0 2px rgba(0,255,136,0.07);
        }
        .settings-input::placeholder {
          color: rgba(255,255,255,0.22);
        }
      `}</style>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: '#f0f0f0', fontFamily: 'monospace', margin: 0 }}>Settings</h1>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4, fontFamily: 'monospace' }}>Atur identitas operator dan data akun.</p>
      </div>

      <section style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <div style={{ width: 32, height: 32, borderRadius: 3, background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <UserCog size={15} style={{ color: '#00ff88' }} />
          </div>
          <div>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: '#f0f0f0', fontFamily: 'monospace', margin: 0 }}>Akun</h2>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.32)', marginTop: 3, fontFamily: 'monospace' }}>Identitas operator dan TPK.</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.55)', marginBottom: 6, fontFamily: 'monospace', fontWeight: 600 }}>Nama Operator</label>
            <input
              type="text"
              value={namaOperator}
              onChange={e => { setNamaOperator(e.target.value); setSaved(false) }}
              placeholder="cth. Budi Santoso"
              className="settings-input"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.55)', marginBottom: 6, fontFamily: 'monospace', fontWeight: 600 }}>Lokasi TPK</label>
            <input
              type="text"
              value={tpk?.namatpk || '—'}
              disabled
              style={disabledInputStyle}
            />
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 6, fontFamily: 'monospace' }}>Dikelola oleh admin.</p>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.55)', marginBottom: 6, fontFamily: 'monospace', fontWeight: 600 }}>Kode TPK</label>
            <input
              type="text"
              value={tpk?.kode_tpk || '—'}
              disabled
              style={disabledInputStyle}
            />
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 6, fontFamily: 'monospace' }}>Dikelola oleh admin.</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap' }}>
          <button
            onClick={handleSave}
            disabled={!canSave}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '8px 14px',
              borderRadius: 3,
              border: 'none',
              background: canSave ? '#00ff88' : 'rgba(255,255,255,0.08)',
              color: canSave ? '#0a0a0a' : 'rgba(255,255,255,0.32)',
              cursor: canSave ? 'pointer' : 'not-allowed',
              fontFamily: 'monospace',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {saving
              ? <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(0,0,0,0.25)', borderTopColor: '#0a0a0a', display: 'inline-block' }} className="animate-spin" />
              : <Save size={15} />}
            Simpan
          </button>
          {saved && !dirty && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#00ff88', fontFamily: 'monospace' }}>
              <Check size={14} /> Tersimpan di sistem
            </span>
          )}
          {dirty && !saving && (
            <span style={{ fontSize: 11, color: '#ffaa00', fontFamily: 'monospace' }}>Perubahan belum disimpan</span>
          )}
          {error && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#ff6b6b', fontFamily: 'monospace' }}><AlertCircle size={13} />{error}</span>
          )}
        </div>
      </section>

      <section style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, padding: 20, marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 32, height: 32, borderRadius: 3, background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Mail size={15} style={{ color: '#00ff88' }} />
          </div>
          <div>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: '#f0f0f0', fontFamily: 'monospace', margin: 0 }}>Keamanan</h2>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.32)', marginTop: 3, fontFamily: 'monospace' }}>Kirim link reset password ke email terdaftar.</p>
          </div>
        </div>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace', marginBottom: 14 }}>
          Email: <span style={{ color: '#f0f0f0' }}>{session?.user?.email || '—'}</span>
        </p>
        <button
          onClick={handleResetPassword}
          disabled={resetSending || resetSent}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '8px 14px',
            borderRadius: 3,
            border: '1px solid rgba(255,255,255,0.12)',
            background: resetSent ? 'rgba(0,255,136,0.08)' : 'rgba(255,255,255,0.04)',
            color: resetSent ? '#00ff88' : 'rgba(255,255,255,0.72)',
            cursor: resetSending || resetSent ? 'not-allowed' : 'pointer',
            fontFamily: 'monospace',
            fontSize: 12,
          }}
        >
          {resetSending
            ? <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#f0f0f0', display: 'inline-block' }} className="animate-spin" />
            : <Mail size={14} />}
          {resetSent ? 'Link dikirim — cek email Anda' : 'Kirim Link Reset Password'}
        </button>
        {resetSent && (
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', marginTop: 8 }}>
            Ikuti instruksi di email untuk mengatur password baru.
          </p>
        )}
      </section>
    </div>
  )
}
