import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import GlobalLayout from '@/components/layout/GlobalLayout'
import Index from '@/pages/Index'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import NotFound from '@/pages/NotFound'
import ClientsPage from '@/pages/clients/ClientsPage'
import ClientFormPage from '@/pages/clients/ClientFormPage'
import LoginPage from '@/pages/auth/LoginPage'
import PlaceholderModule from '@/pages/PlaceholderModule'
import { AuthProvider, useAuth } from '@/hooks/use-auth'
import { Loader2 } from 'lucide-react'

// Protected Route Component
const ProtectedRoute = () => {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

const App = () => (
  <AuthProvider>
    <BrowserRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<GlobalLayout />}>
              <Route path="/" element={<Index />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/clientes" element={<ClientsPage />} />
              <Route path="/clientes/novo" element={<ClientFormPage />} />
              <Route path="/clientes/:id" element={<ClientFormPage />} />

              {/* New Modules Routes */}
              <Route path="/funcionarios" element={<PlaceholderModule />} />
              <Route path="/produtos" element={<PlaceholderModule />} />
              <Route path="/acerto" element={<PlaceholderModule />} />
              <Route path="/complemento" element={<PlaceholderModule />} />
              <Route path="/recebimento" element={<PlaceholderModule />} />
              <Route path="/nota-fiscal" element={<PlaceholderModule />} />
              <Route path="/caixa" element={<PlaceholderModule />} />
              <Route path="/cobranca" element={<PlaceholderModule />} />
              <Route path="/inventario" element={<PlaceholderModule />} />
              <Route path="/rota" element={<PlaceholderModule />} />
              <Route path="/relatorio" element={<PlaceholderModule />} />
              <Route path="/pendencias" element={<PlaceholderModule />} />

              {/* Keep legacy route just in case, or map to Recebimento */}
              <Route path="/vendas" element={<PlaceholderModule />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </BrowserRouter>
  </AuthProvider>
)

export default App
