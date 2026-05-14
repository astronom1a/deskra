import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Printer, ArrowLeft } from 'lucide-react'

export function CetakPageSkeleton({ landscape = false }) {
  return (
    <div className={`animate-pulse ${landscape ? 'w-full' : 'max-w-[210mm] mx-auto'}`}>
      <div className="h-4 w-40 bg-gray-200 mb-3"></div>
      <div className="h-3 w-64 bg-gray-200 mb-6"></div>
      <div className="border border-gray-200 overflow-hidden mb-5">
        <div className="h-8 bg-gray-100 border-b border-gray-200"></div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 px-3 py-2 border-b border-gray-100">
            <div className="col-span-1 h-3 bg-gray-200"></div>
            <div className="col-span-3 h-3 bg-gray-200"></div>
            <div className="col-span-2 h-3 bg-gray-200"></div>
            <div className="col-span-2 h-3 bg-gray-200"></div>
            <div className="col-span-2 h-3 bg-gray-200"></div>
            <div className="col-span-2 h-3 bg-gray-200"></div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-6 mt-8">
        <div className="h-14 bg-gray-200"></div>
        <div className="h-14 bg-gray-200"></div>
        <div className="h-14 bg-gray-200"></div>
      </div>
    </div>
  )
}

export default function CetakLayout({ title, landscape = false, children: render }) {
  const { periodeId } = useParams()
  const [periode, setPeriode] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('tabel_periode').select('*').eq('id', periodeId).maybeSingle()
      setPeriode(data)
      setLoading(false)
    })()
  }, [periodeId])

  return (
    <div className="min-h-screen print:bg-white" style={{ background: '#0a0a0a' }}>
      {/* Toolbar – hanya tampil di layar */}
      <div
        className="print:hidden px-6 py-3 flex items-center justify-between sticky top-0 z-10"
        style={{
          background: '#0d0d0d',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => window.close()}
            className="flex items-center gap-1.5 text-sm"
            style={{
              color: 'rgba(255,255,255,0.38)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'monospace',
              padding: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#f0f0f0' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.38)' }}
          >
            <ArrowLeft size={15}/> Tutup Tab
          </button>
          <span style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.08)' }} />
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: '#f0f0f0', fontFamily: 'monospace' }}>{title}</p>
            {periode && (
              <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.28)', fontFamily: 'monospace', marginTop: 1 }}>
                {periode.periode}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 text-sm"
          style={{
            padding: '7px 14px',
            background: '#00ff88',
            color: '#0a0a0a',
            border: 'none',
            borderRadius: 3,
            cursor: 'pointer',
            fontFamily: 'monospace',
            fontWeight: 700,
            flexShrink: 0,
          }}
        ><Printer size={14}/> Cetak</button>
      </div>

      {/* Continuous paper 9.5"×11" = 240mm×280mm (portrait) / 280mm×240mm (landscape) */}
      <style>{`@media print { @page { size: ${landscape ? '280mm 240mm' : '240mm 280mm'}; margin: 0; } .print-area { padding: 10mm !important; color: #000 !important; background: #fff !important; } }`}</style>

      {/* Konten cetak — kanvas selalu putih, walau app dark mode */}
      <div className={`print-area cetak-canvas mx-auto bg-white text-gray-900 shadow-sm my-6 p-10 print:shadow-none print:my-0 ${landscape ? 'max-w-[280mm]' : 'max-w-[240mm]'}`}>
        {loading ? (
          <CetakPageSkeleton landscape={landscape} />
        ) : !periode ? (
          <p className="text-center text-red-500 text-sm py-10" style={{ fontFamily: 'monospace' }}>Periode tidak ditemukan.</p>
        ) : (
          render(periode)
        )}
      </div>
    </div>
  )
}
