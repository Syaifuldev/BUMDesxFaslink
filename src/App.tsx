import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { PageSpinner } from '@/components/ui/Spinner'
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import DashboardPage from '@/pages/DashboardPage'
import EventsPage from '@/pages/EventsPage'
import EventDetailPage from '@/pages/EventDetailPage'
import GuestsPage from '@/pages/GuestsPage'
import ScannerPage from '@/pages/ScannerPage'
import ManualCheckinPage from '@/pages/ManualCheckinPage'
import CheckinHistoryPage from '@/pages/CheckinHistoryPage'
import AnalyticsPage from '@/pages/AnalyticsPage'
import OperatorsPage from '@/pages/OperatorsPage'
import NotFoundPage from '@/pages/NotFoundPage'

function PrivateRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: ('superadmin' | 'operator')[] }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <PageSpinner />
  if (!user) return <Navigate to="/login" replace />
  
  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return <Navigate to={profile.role === 'operator' ? '/scanner' : '/'} replace />
  }
  
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <PageSpinner />
  if (user) return <Navigate to="/" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

      {/* Protected - Superadmin Only */}
      <Route path="/" element={<PrivateRoute allowedRoles={['superadmin']}><DashboardPage /></PrivateRoute>} />
      <Route path="/events" element={<PrivateRoute allowedRoles={['superadmin']}><EventsPage /></PrivateRoute>} />
      <Route path="/events/:id" element={<PrivateRoute allowedRoles={['superadmin']}><EventDetailPage /></PrivateRoute>} />
      <Route path="/guests" element={<PrivateRoute allowedRoles={['superadmin']}><GuestsPage /></PrivateRoute>} />
      <Route path="/analytics" element={<PrivateRoute allowedRoles={['superadmin']}><AnalyticsPage /></PrivateRoute>} />
      <Route path="/operators" element={<PrivateRoute allowedRoles={['superadmin']}><OperatorsPage /></PrivateRoute>} />
      
      {/* Protected - Superadmin & Operator */}
      <Route path="/scanner" element={<PrivateRoute allowedRoles={['superadmin', 'operator']}><ScannerPage /></PrivateRoute>} />
      <Route path="/manual-checkin" element={<PrivateRoute allowedRoles={['superadmin', 'operator']}><ManualCheckinPage /></PrivateRoute>} />
      <Route path="/history" element={<PrivateRoute allowedRoles={['superadmin', 'operator']}><CheckinHistoryPage /></PrivateRoute>} />

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster
            position="top-right"
            gutter={8}
            containerStyle={{ top: 16, right: 16 }}
            toastOptions={{
              duration: 3500,
              style: {
                maxWidth: '360px',
                fontSize: '14px',
                fontFamily: 'Inter, system-ui, sans-serif',
              },
              success: {
                style: {
                  background: 'var(--toast-success-bg, #f0fdf4)',
                  color: '#166534',
                  border: '1px solid #bbf7d0',
                },
                iconTheme: { primary: '#16a34a', secondary: '#f0fdf4' },
              },
              error: {
                style: {
                  background: 'var(--toast-error-bg, #fef2f2)',
                  color: '#991b1b',
                  border: '1px solid #fecaca',
                },
                iconTheme: { primary: '#dc2626', secondary: '#fef2f2' },
              },
              loading: {
                style: {
                  background: '#f8fafc',
                  color: '#1e293b',
                  border: '1px solid #e2e8f0',
                },
              },
            }}
          />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
