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
import ConfirmacaoRecebimentosPage from '@/pages/confirmacao/ConfirmacaoRecebimentosPage'
import CobrancaPage from '@/pages/cobranca/CobrancaPage'
import NotaFiscalPage from '@/pages/nota-fiscal/NotaFiscalPage'
import PendenciasPage from '@/pages/pendencias/PendenciasPage'
import RotaPage from '@/pages/rota/RotaPage'
import BackupPage from '@/pages/backup/BackupPage'
import RelatorioDashboard from '@/pages/relatorio/RelatorioDashboard'
import ProjectionsPage from '@/pages/relatorio/ProjectionsPage'
import SalesReportsPage from '@/pages/relatorio/SalesReportsPage'
import StockReportsPage from '@/pages/relatorio/StockReportsPage'
import CaixaPage from '@/pages/caixa/CaixaPage'
import PixPage from '@/pages/pix/PixPage'
import PagamentosPage from '@/pages/pagamentos/PagamentosPage'
import ControlePage from '@/pages/controle/ControlePage'
import InventarioPage from '@/pages/inventario/InventarioPage'
import ContagemPage from '@/pages/inventario/ContagemPage'
import ResumoAcertosPage from '@/pages/resumo-acertos/ResumoAcertosPage' // New Page
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
              <Route
                path="/confirmacao-recebimentos"
                element={<ConfirmacaoRecebimentosPage />}
              />
              {/* Pix Module */}
              <Route path="/pix" element={<PixPage />} />
              {/* Pagamentos Module */}
              <Route path="/pagamentos" element={<PagamentosPage />} />
              {/* Controle Module - NEW */}
              <Route path="/controle" element={<ControlePage />} />
              {/* Cobranca Module */}
              <Route path="/cobranca" element={<CobrancaPage />} />
              {/* Nota Fiscal Module */}
              <Route path="/nota-fiscal" element={<NotaFiscalPage />} />
              {/* Pendencias Module */}
              <Route path="/pendencias" element={<PendenciasPage />} />
              {/* Rota Module */}
              <Route path="/rota" element={<RotaPage />} />
              {/* Resumo Acertos Module - NEW */}
              <Route path="/resumo-acertos" element={<ResumoAcertosPage />} />
              {/* Backup & Export Module */}
              <Route path="/backup" element={<BackupPage />} />
              {/* Reports Module */}
              <Route path="/relatorio" element={<RelatorioDashboard />} />
              <Route
                path="/relatorio/projecoes"
                element={<ProjectionsPage />}
              />
              <Route path="/relatorio/vendas" element={<SalesReportsPage />} />
              <Route path="/relatorio/estoque" element={<StockReportsPage />} />
              {/* Caixa Module */}
              <Route path="/caixa" element={<CaixaPage />} />
              {/* Inventario Module */}
              <Route path="/inventario" element={<InventarioPage />} />
              <Route
                path="/inventario/contagem"
                element={<ContagemPage />}
              />{' '}
              {/* New Route */}
              <Route path="/complemento" element={<PlaceholderModule />} />
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
