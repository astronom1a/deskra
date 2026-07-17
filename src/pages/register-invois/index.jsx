import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Receipt, Users, Layers, BarChart3 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthProvider'
import { getEffectiveTpkId } from '../../lib/effectiveTpk'
import Toast, { useToast } from '../../components/ui/Toast'
import TpkRequiredState from '../../components/layout/TpkRequiredState'
import RegisterKaplingStyles from '../register-kapling/components/RegisterKaplingStyles.jsx'
import TabPembeli from './tabs/TabPembeli.jsx'
import TabInvois from './tabs/TabInvois.jsx'
import TabRekapSortimen from './tabs/TabRekapSortimen.jsx'

const TABS = [
  { key: 'pembeli', label: 'register pembeli', icon: Users,   desc: 'nomor akun & nama pembeli' },
  { key: 'invois',  label: 'register invois',  icon: Receipt, desc: 'daftar invois & pembelinya — pembeli otomatis tersinkron ke register kapling' },
  { key: 'rekap',   label: 'rekap sortimen',   icon: Layers,  desc: 'batang & kubikasi per invois per sortimen, otomatis dari register kapling' },
]

async function fetchPaged({ order, select, table, tpkId }) {
  const PAGE = 1000
  const all = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .eq('tpk_id', tpkId)
      .order(order, { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < PAGE) break
  }
  return all
}

export default function RegisterInvois() {
  const { profile, activeTpkId } = useAuth()
  const tpkId = getEffectiveTpkId({ activeTpkId, profile })
  const [searchParams, setSearchParams] = useSearchParams()

  const [invoisRows, setInvoisRows]   = useState([])
  const [pembeliRows, setPembeliRows] = useState([])
  const [kaplingRows, setKaplingRows] = useState([])
  const [loading, setLoading]         = useState(true)

  const { toast, showToast } = useToast(3500)

  const tabParam  = searchParams.get('tab')
  const activeTab = TABS.some(t => t.key === tabParam) ? tabParam : 'invois'
  const tabInfo   = TABS.find(t => t.key === activeTab)

  function setTab(key) {
    setSearchParams(key === 'invois' ? {} : { tab: key }, { replace: true })
  }

  async function fetchData() {
    if (!tpkId) { setInvoisRows([]); setPembeliRows([]); setKaplingRows([]); setLoading(false); return }
    setLoading(true)
    try {
      const [invois, pembeli, kapling] = await Promise.all([
        fetchPaged({ table: 'tabel_invois',  select: 'id,no_invois,pembeli,created_at', order: 'no_invois', tpkId }),
        fetchPaged({ table: 'tabel_pembeli', select: 'id,akun,pembeli',                 order: 'akun',      tpkId }),
        fetchPaged({ table: 'tabel_register_kapling', select: 'id,no_invois,pembeli,sortimen,batang,volume', order: 'no_kapling', tpkId }),
      ])
      setInvoisRows(invois)
      setPembeliRows(pembeli)
      setKaplingRows(kapling.filter(r => (r.no_invois || '').trim()))
    } catch (error) {
      showToast(error.message, 'error')
    }
    setLoading(false)
  }
  useEffect(() => { fetchData() }, [tpkId])

  if (!tpkId) return <TpkRequiredState />

  const tabProps = { invoisRows, kaplingRows, loading, pembeliRows, profile, refetch: fetchData, showToast, tpkId }

  return (
    <div className="ds-page" style={{ minHeight: '100%', background: '#0a0a0a', color: '#f0f0f0' }}>
      <RegisterKaplingStyles />
      <Toast toast={toast} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Receipt size={18} style={{ color: '#00ff88' }} />
            <h1 style={{ fontSize: 18, fontWeight: 700, color: '#f0f0f0', fontFamily: 'monospace' }}>Register Invois</h1>
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 3, fontFamily: 'monospace' }}>
            {tabInfo.desc}
          </p>
        </div>
        <Link to="/register-kapling"
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', fontSize: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace', textDecoration: 'none', flexShrink: 0 }}
        ><BarChart3 size={13} /> statistik kapling</Link>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.08)', flexWrap: 'wrap' }}>
        {TABS.map(tab => {
          const active = tab.key === activeTab
          return (
            <button key={tab.key} onClick={() => setTab(tab.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px',
                fontSize: 11, fontFamily: 'monospace', fontWeight: active ? 700 : 400,
                textTransform: 'uppercase', letterSpacing: '0.06em',
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: active ? '#00ff88' : 'rgba(255,255,255,0.4)',
                borderBottom: `2px solid ${active ? '#00ff88' : 'transparent'}`,
                marginBottom: -1, transition: 'color 0.15s, border-color 0.15s',
              }}
            ><tab.icon size={13} /> {tab.label}</button>
          )
        })}
      </div>

      {activeTab === 'pembeli' && <TabPembeli {...tabProps} />}
      {activeTab === 'invois'  && <TabInvois {...tabProps} />}
      {activeTab === 'rekap'   && <TabRekapSortimen {...tabProps} />}
    </div>
  )
}
