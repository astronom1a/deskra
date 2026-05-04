import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthProvider'
import Layout from './components/Layout'
import Login from './pages/Login'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminTpkList from './pages/admin/AdminTpkList'
import AdminTpkBuat from './pages/admin/AdminTpkBuat'
import AdminTpkDetail from './pages/admin/AdminTpkDetail'
import Dashboard from './pages/Dashboard'
import MainLink from './pages/MainLink'
import DatabasePejabat from './pages/DatabasePejabat'
import DatabaseTarif from './pages/DatabaseTarif'
import DatabaseTenaga from './pages/DatabaseTenaga'
import TumpukKapling from './pages/TumpukKapling'
import DetailPekerjaan from './pages/DetailPekerjaan'
import RegisterKapling from './pages/RegisterKapling'
import DkhpSkshhk from './pages/DkhpSkshhk'
import Settings from './pages/Settings'
import CetakBiayaTPK from './pages/Cetak/CetakBiayaTPK'
import CetakGabunganPembayaran from './pages/Cetak/CetakGabunganPembayaran'
import CetakPjUk from './pages/Cetak/CetakPjUk'
import CetakPermintaanUk from './pages/Cetak/CetakPermintaanUk'
import CetakKwitansi from './pages/Cetak/CetakKwitansi'
import CetakLampiran31 from './pages/Cetak/CetakLampiran31'
import CetakAbsen from './pages/Cetak/CetakAbsen'

function ProtectedRoute({ children }) {
  const { session, isAdmin, profile, loading } = useAuth()
  const location = useLocation()

  if (loading || (session && !profile)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <span className="inline-block w-6 h-6 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (isAdmin) {
    return <Navigate to="/admin" replace />
  }

  return children
}

function AdminRoute({ children }) {
  const { session, isAdmin, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <span className="inline-block w-6 h-6 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) return <Navigate to="/login" state={{ from: location }} replace />
  if (!isAdmin) return <Navigate to="/dashboard" replace />

  return children
}

function PublicRoute({ children }) {
  const { session, isAdmin, loading, profile } = useAuth()

  if (loading || (session && !profile)) return null

  if (session) {
    return <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace />
  }

  return children
}

function SmartRedirect() {
  const { session, isAdmin, profile, loading } = useAuth()
  if (loading || (session && !profile)) return null
  return <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace />
}

function TitleUpdater() {
  const { session, isAdmin, tpk, loading } = useAuth()

  useEffect(() => {
    if (loading) return
    if (!session) {
      document.title = 'Deskra'
      return
    }
    if (isAdmin) {
      document.title = 'Deskra — Admin'
    } else {
      const nama = tpk?.nama_tpk ?? 'TPK'
      document.title = `Deskra — TPK ${nama}`
    }
  }, [session, isAdmin, tpk, loading])

  return null
}

function AppRoutes() {
  return (
    <>
      <TitleUpdater />
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      {/* Admin routes */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <Layout />
          </AdminRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="tpk" element={<AdminTpkList />} />
        <Route path="tpk/buat" element={<AdminTpkBuat />} />
        <Route path="tpk/:id" element={<AdminTpkDetail />} />
      </Route>

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="register-kapling" element={<RegisterKapling />} />
        <Route path="dkhp-skshhk" element={<DkhpSkshhk />} />
        <Route path="main-link" element={<MainLink />} />
        <Route path="tumpuk-kapling" element={<TumpukKapling />} />
        <Route path="detail-pekerjaan" element={<DetailPekerjaan />} />
        <Route path="database/pejabat" element={<DatabasePejabat />} />
        <Route path="database/tenaga" element={<DatabaseTenaga />} />
        <Route path="database/tarif" element={<DatabaseTarif />} />
        <Route path="settings" element={<Settings />} />
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

      <Route path="*" element={<SmartRedirect />} />
    </Routes>
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
