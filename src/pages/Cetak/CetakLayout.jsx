import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Printer, ArrowLeft } from 'lucide-react'

export function CetakPageSkeleton({ landscape = false }) {
  return (
    <div className={`animate-pulse ${landscape ? 'w-full' : 'max-w-[210mm] mx-auto'}`}>
      <div className="h-4 w-40 bg-gray-200 rounded mb-3"></div>
      <div className="h-3 w-64 bg-gray-200 rounded mb-6"></div>
      <div className="border border-gray-200 rounded overflow-hidden mb-5">
        <div className="h-8 bg-gray-100 border-b border-gray-200"></div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 px-3 py-2 border-b border-gray-100">
            <div className="col-span-1 h-3 bg-gray-200 rounded"></div>
            <div className="col-span-3 h-3 bg-gray-200 rounded"></div>
            <div className="col-span-2 h-3 bg-gray-200 rounded"></div>
            <div className="col-span-2 h-3 bg-gray-200 rounded"></div>
            <div className="col-span-2 h-3 bg-gray-200 rounded"></div>
            <div className="col-span-2 h-3 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-6 mt-8">
        <div className="h-14 bg-gray-200 rounded"></div>
        <div className="h-14 bg-gray-200 rounded"></div>
        <div className="h-14 bg-gray-200 rounded"></div>
      </div>
    </div>
  )
}

export default function CetakLayout({ title, landscape = false, children: render }) {
  const { periodeId } = useParams()
  const navigate = useNavigate()
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
    <div className="min-h-screen bg-gray-100">
      {/* Toolbar – hanya tampil di layar */}
      <div className="print:hidden bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/main-link')} className="text-gray-500 hover:text-gray-700 flex items-center gap-1 text-sm">
            <ArrowLeft size={15}/> Kembali ke Main Link
          </button>
          <span className="text-gray-300">|</span>
          <p className="text-sm font-semibold text-gray-700">{title}</p>
          {periode && <span className="text-xs text-gray-400">— {periode.periode}</span>}
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-1.5 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700"
        ><Printer size={14}/> Cetak</button>
      </div>

      {landscape && (
        <style>{`@media print { @page { size: A4 landscape; margin: 10mm; } }`}</style>
      )}

      {/* Konten cetak */}
      <div className={`print-area mx-auto bg-white shadow-sm my-6 p-10 print:shadow-none print:my-0 print:p-0 ${landscape ? 'max-w-[297mm]' : 'max-w-[210mm]'}`}>
        {loading ? (
          <CetakPageSkeleton landscape={landscape} />
        ) : !periode ? (
          <p className="text-center text-red-500 text-sm py-10">Periode tidak ditemukan.</p>
        ) : (
          render(periode)
        )}
      </div>
    </div>
  )
}

