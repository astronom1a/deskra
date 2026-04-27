import { ClipboardList } from 'lucide-react'

export default function RegisterKapling() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Register Kapling</h1>
        <p className="text-gray-500 text-sm mt-1">Pencatatan register kapling — model tampilan menyusul</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-10 flex flex-col items-center justify-center text-center">
        <div className="w-14 h-14 rounded-full bg-primary-50 flex items-center justify-center mb-4">
          <ClipboardList size={26} className="text-primary-600" />
        </div>
        <p className="font-semibold text-gray-700">Belum ada model tampilan</p>
        <p className="text-gray-400 text-sm mt-1 max-w-md">
          Halaman ini disiapkan untuk fitur Register Kapling. Tampilan dan
          struktur data akan ditentukan kemudian.
        </p>
      </div>
    </div>
  )
}
