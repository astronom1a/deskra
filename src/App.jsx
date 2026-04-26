import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import MainLink from './pages/MainLink'
import DatabasePejabat from './pages/DatabasePejabat'
import DatabaseTarif from './pages/DatabaseTarif'
import DatabaseTenaga from './pages/DatabaseTenaga'
import TumpukKapling from './pages/TumpukKapling'
import DetailPekerjaan from './pages/DetailPekerjaan'
import CetakBiayaTPK from './pages/Cetak/CetakBiayaTPK'
import CetakGabunganPembayaran from './pages/Cetak/CetakGabunganPembayaran'
import CetakPjUk from './pages/Cetak/CetakPjUk'
import CetakPermintaanUk from './pages/Cetak/CetakPermintaanUk'
import CetakKwitansi from './pages/Cetak/CetakKwitansi'
import CetakLampiran31 from './pages/Cetak/CetakLampiran31'
import CetakAbsen from './pages/Cetak/CetakAbsen'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="main-link" element={<MainLink />} />
        <Route path="tumpuk-kapling" element={<TumpukKapling />} />
        <Route path="detail-pekerjaan" element={<DetailPekerjaan />} />
        <Route path="database/pejabat" element={<DatabasePejabat />} />
        <Route path="database/tenaga" element={<DatabaseTenaga />} />
        <Route path="database/tarif" element={<DatabaseTarif />} />
      </Route>
      {/* Halaman cetak — standalone tanpa sidebar */}
      <Route path="cetak/biaya-tpk/:periodeId" element={<CetakBiayaTPK />} />
      <Route path="cetak/gabungan-pembayaran/:periodeId" element={<CetakGabunganPembayaran />} />
      <Route path="cetak/pj-uk/:periodeId" element={<CetakPjUk />} />
      <Route path="cetak/permintaan-uk/:periodeId" element={<CetakPermintaanUk />} />
      <Route path="cetak/kwitansi/:periodeId/:itemKey" element={<CetakKwitansi />} />
      <Route path="cetak/lampiran-31/:periodeId/:itemKey" element={<CetakLampiran31 />} />
      <Route path="cetak/lampiran-62/:periodeId/:itemKey" element={<CetakLampiran31 />} />
      <Route path="cetak/absen/:periodeId" element={<CetakAbsen />} />
      <Route path="cetak/absen/:periodeId/:itemKey" element={<CetakAbsen />} />
    </Routes>
  )
}
