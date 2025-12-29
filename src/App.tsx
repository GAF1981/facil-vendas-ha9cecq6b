import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import GlobalLayout from '@/components/layout/GlobalLayout'
import Index from '@/pages/Index'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import NotFound from '@/pages/NotFound'
import ClientsPage from '@/pages/clients/ClientsPage'
import ClientFormPage from '@/pages/clients/ClientFormPage'
import ClientHistoryPage from '@/pages/clients/ClientHistoryPage'
import EmployeesPage from '@/pages/employees/EmployeesPage'
import EmployeeFormPage from '@/pages/employees/EmployeeFormPage'
import ProductsPage from '@/pages/products/ProductsPage'
import ProductFormPage from '@/pages/products/ProductFormPage'
import PlaceholderModule from '@/pages/PlaceholderModule'
import LoginPage from '@/pages/auth/LoginPage'
import AcertoPage from '@/pages/acerto/AcertoPage'
import RecebimentoPage from '@/pages/recebimento/RecebimentoPage'
import CobrancaPage from '@/pages/cobranca/CobrancaPage'
import { AuthProvider } from '@/hooks/use-auth'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

const App = () => (
  <BrowserRouter
    future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
  >
    <AuthProvider>
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
              <Route
                path="/clientes/:id/historico"
                element={<ClientHistoryPage />}
              />

              <Route path="/funcionarios" element={<EmployeesPage />} />
              <Route path="/funcionarios/novo" element={<EmployeeFormPage />} />
              <Route path="/funcionarios/:id" element={<EmployeeFormPage />} />

              <Route path="/produtos" element={<ProductsPage />} />
              <Route path="/produtos/novo" element={<ProductFormPage />} />
              <Route path="/produtos/:id" element={<ProductFormPage />} />

              {/* Acerto Module */}
              <Route path="/acerto" element={<AcertoPage />} />

              {/* Recebimento Module */}
              <Route path="/recebimento" element={<RecebimentoPage />} />

              {/* Cobranca Module (NEW) */}
              <Route path="/cobranca" element={<CobrancaPage />} />

              {/* New Modules Routes */}
              <Route path="/complemento" element={<PlaceholderModule />} />
              <Route path="/nota-fiscal" element={<PlaceholderModule />} />
              <Route path="/caixa" element={<PlaceholderModule />} />
              <Route path="/inventario" element={<PlaceholderModule />} />
              <Route path="/rota" element={<PlaceholderModule />} />
              <Route path="/relatorio" element={<PlaceholderModule />} />
              <Route path="/pendencias" element={<PlaceholderModule />} />

              <Route path="/vendas" element={<PlaceholderModule />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
