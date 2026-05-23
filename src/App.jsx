import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthProvider'
import Layout from './components/layout/Layout'
import { PageLoader } from './components/ui/LoadingState'
import Login from './pages/Login'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminTpkList from './pages/admin/AdminTpkList'
import AdminTpkBuat from './pages/admin/AdminTpkBuat'
import AdminTpkDetail from './pages/admin/AdminTpkDetail'
import Dashboard from './pages/Dashboard'
import MainLink from './pages/MainLink'
import DatabasePejabat from './pages/database/DatabasePejabat'
import DatabaseTarif from './pages/database/DatabaseTarif'
import DatabaseTenaga from './pages/database/DatabaseTenaga'
import TumpukKapling from './pages/TumpukKapling'
import DetailPekerjaan from './pages/DetailPekerjaan'
import RegisterKapling from './pages/register-kapling'
import DkhpSkshhk from './pages/DkhpSkshhk'
import Dk310             from './pages/dk310/Dk310'
import Dk310Detail       from './pages/dk310/Dk310Detail'
import Dk310Pengurangan  from './pages/dk310/Dk310Pengurangan'
import KayuBernomor     from './pages/KayuBernomor'
import Settings from './pages/Settings'
import { canUseOperatorRoutes, getAuthenticatedHomePath } from './lib/adminOperatorContext'

// Halaman cetak di-lazy-load — hanya dimuat saat dibutuhkan
const CetakBiayaTPK          = lazy(() => import('./pages/Cetak/CetakBiayaTPK'))
const CetakGabunganPembayaran = lazy(() => import('./pages/Cetak/CetakGabunganPembayaran'))
const CetakPjUk               = lazy(() => import('./pages/Cetak/CetakPjUk'))
const CetakPermintaanUk       = lazy(() => import('./pages/Cetak/CetakPermintaanUk'))
const CetakKwitansi           = lazy(() => import('./pages/Cetak/CetakKwitansi'))
const CetakLampiran31         = lazy(() => import('./pages/Cetak/CetakLampiran31'))
const CetakAbsen              = lazy(() => import('./pages/Cetak/CetakAbsen'))

function PrintFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <span className="inline-block w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
    </div>
  )
}

function PrintRoute({ children }) {
  const { session, loading } = useAuth()
  const location = useLocation()
  if (loading) return <PrintFallback />
  if (!session) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}

function PrintSuspense({ Component }) {
  return (
    <PrintRoute>
      <Suspense fallback={<PrintFallback />}>
        <Component />
      </Suspense>
    </PrintRoute>
  )
}

function ProtectedRoute({ children }) {
  const { session, isAdmin, profile, activeTpkId, loading } = useAuth()
  const location = useLocation()

  if (loading || (session && !profile)) {
    return <PageLoader label="memuat sesi..." />
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!canUseOperatorRoutes({ isAdmin, activeTpkId })) {
    return <Navigate to="/admin" replace />
  }

  return children
}

function AdminRoute({ children }) {
  const { session, isAdmin, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <PageLoader label="memuat admin..." />
  }

  if (!session) return <Navigate to="/login" state={{ from: location }} replace />
  if (!isAdmin) return <Navigate to="/dashboard" replace />

  return children
}

function PublicRoute({ children }) {
  const { session, isAdmin, activeTpkId, loading, profile } = useAuth()

  if (loading || (session && !profile)) return <PageLoader label="memuat halaman..." />

  if (session) {
    return <Navigate to={getAuthenticatedHomePath({ isAdmin, activeTpkId })} replace />
  }

  return children
}

function SmartRedirect() {
  const { session, isAdmin, activeTpkId, profile, loading } = useAuth()
  if (loading || (session && !profile)) return <PageLoader label="memuat halaman..." />
  return <Navigate to={getAuthenticatedHomePath({ isAdmin, activeTpkId })} replace />
}

function TitleUpdater() {
  const { session, isAdmin, tpk, activeTpkId, loading } = useAuth()

  useEffect(() => {
    if (loading) return
    if (!session) {
      document.title = 'Deskra'
      return
    }
    if (isAdmin && !activeTpkId) {
      document.title = 'Deskra — Admin'
    } else {
      const nama = tpk?.namatpk ?? 'TPK'
      document.title = `Deskra — ${nama}`
    }
  }, [session, isAdmin, tpk, activeTpkId, loading])

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
        <Route path="dk310/penambahan"       element={<Dk310 />} />
        <Route path="dk310/penambahan/:id"  element={<Dk310Detail />} />
        <Route path="dk310/pengurangan"     element={<Dk310Pengurangan />} />
        <Route path="dk310/pengurangan/:id" element={<Dk310Detail />} />
        <Route path="kayu-bernomor" element={<KayuBernomor />} />
        <Route path="main-link" element={<MainLink />} />
        <Route path="tumpuk-kapling" element={<TumpukKapling />} />
        <Route path="detail-pekerjaan" element={<DetailPekerjaan />} />
        <Route path="database/pejabat" element={<DatabasePejabat />} />
        <Route path="database/tenaga" element={<DatabaseTenaga />} />
        <Route path="database/tarif" element={<DatabaseTarif />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Halaman cetak — standalone, lazy-loaded, dilindungi auth */}
      <Route path="cetak/biaya-tpk/:periodeId"           element={<PrintSuspense Component={CetakBiayaTPK} />} />
      <Route path="cetak/gabungan-pembayaran/:periodeId" element={<PrintSuspense Component={CetakGabunganPembayaran} />} />
      <Route path="cetak/pj-uk/:periodeId"               element={<PrintSuspense Component={CetakPjUk} />} />
      <Route path="cetak/permintaan-uk/:periodeId"       element={<PrintSuspense Component={CetakPermintaanUk} />} />
      <Route path="cetak/kwitansi/:periodeId/:itemKey"   element={<PrintSuspense Component={CetakKwitansi} />} />
      <Route path="cetak/lampiran-31/:periodeId/:itemKey" element={<PrintSuspense Component={CetakLampiran31} />} />
      <Route path="cetak/lampiran-62/:periodeId/:itemKey" element={<PrintSuspense Component={CetakLampiran31} />} />
      <Route path="cetak/absen/:periodeId"               element={<PrintSuspense Component={CetakAbsen} />} />
      <Route path="cetak/absen/:periodeId/:itemKey"      element={<PrintSuspense Component={CetakAbsen} />} />

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
