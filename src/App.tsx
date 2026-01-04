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
import TopSellingReportsPage from '@/pages/relatorio/TopSellingReportsPage'
import AdjustmentReportsPage from '@/pages/relatorio/AdjustmentReportsPage'
import CaixaPage from '@/pages/caixa/CaixaPage'
import PixPage from '@/pages/pix/PixPage'
import PagamentosPage from '@/pages/pagamentos/PagamentosPage'
import ControlePage from '@/pages/controle/ControlePage'
import InventarioPage from '@/pages/inventario/InventarioPage'
import ContagemPage from '@/pages/inventario/ContagemPage'
import ResumoAcertosPage from '@/pages/resumo-acertos/ResumoAcertosPage'
import PermissionsPage from '@/pages/admin/PermissionsPage'
import { AuthProvider } from '@/hooks/use-auth'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PermissionsProvider } from '@/hooks/use-permissions'
import { PermissionGuard } from '@/components/auth/PermissionGuard'

const App = () => (
  <BrowserRouter
    future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
  >
    <AuthProvider>
      <PermissionsProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<GlobalLayout />}>
                <Route path="/" element={<Index />} />
                <Route path="/dashboard" element={<DashboardPage />} />

                {/* Modules protected by PermissionGuard */}
                <Route element={<PermissionGuard module="Clientes" />}>
                  <Route path="/clientes" element={<ClientsPage />} />
                  <Route path="/clientes/novo" element={<ClientFormPage />} />
                  <Route path="/clientes/:id" element={<ClientFormPage />} />
                  <Route
                    path="/clientes/:id/historico"
                    element={<ClientHistoryPage />}
                  />
                </Route>

                <Route element={<PermissionGuard module="Funcionários" />}>
                  <Route path="/funcionarios" element={<EmployeesPage />} />
                  <Route
                    path="/funcionarios/novo"
                    element={<EmployeeFormPage />}
                  />
                  <Route
                    path="/funcionarios/:id"
                    element={<EmployeeFormPage />}
                  />
                </Route>

                <Route element={<PermissionGuard module="Produtos" />}>
                  <Route path="/produtos" element={<ProductsPage />} />
                  <Route path="/produtos/novo" element={<ProductFormPage />} />
                  <Route path="/produtos/:id" element={<ProductFormPage />} />
                </Route>

                <Route element={<PermissionGuard module="Acerto" />}>
                  <Route path="/acerto" element={<AcertoPage />} />
                </Route>

                <Route element={<PermissionGuard module="Recebimento" />}>
                  <Route path="/recebimento" element={<RecebimentoPage />} />
                  <Route
                    path="/confirmacao-recebimentos"
                    element={<ConfirmacaoRecebimentosPage />}
                  />
                </Route>

                <Route element={<PermissionGuard module="Pix" />}>
                  <Route path="/pix" element={<PixPage />} />
                </Route>

                <Route element={<PermissionGuard module="Pagamentos" />}>
                  {/* Assuming Pagamentos module name or maybe mapped to Pix? Using name for now */}
                  <Route path="/pagamentos" element={<PagamentosPage />} />
                </Route>

                <Route element={<PermissionGuard module="Controle" />}>
                  {/* Module check for Control if distinct */}
                  <Route path="/controle" element={<ControlePage />} />
                </Route>

                <Route element={<PermissionGuard module="Cobrança" />}>
                  <Route path="/cobranca" element={<CobrancaPage />} />
                </Route>

                <Route element={<PermissionGuard module="Nota Fiscal" />}>
                  <Route path="/nota-fiscal" element={<NotaFiscalPage />} />
                </Route>

                <Route element={<PermissionGuard module="Pendências" />}>
                  <Route path="/pendencias" element={<PendenciasPage />} />
                </Route>

                <Route element={<PermissionGuard module="Rota" />}>
                  <Route path="/rota" element={<RotaPage />} />
                </Route>

                <Route element={<PermissionGuard module="Resumo Acertos" />}>
                  <Route
                    path="/resumo-acertos"
                    element={<ResumoAcertosPage />}
                  />
                </Route>

                <Route element={<PermissionGuard module="Backup" />}>
                  <Route path="/backup" element={<BackupPage />} />
                </Route>

                <Route element={<PermissionGuard module="Relatório" />}>
                  <Route path="/relatorio" element={<RelatorioDashboard />} />
                  <Route
                    path="/relatorio/projecoes"
                    element={<ProjectionsPage />}
                  />
                  <Route
                    path="/relatorio/vendas"
                    element={<SalesReportsPage />}
                  />
                  <Route
                    path="/relatorio/estoque"
                    element={<StockReportsPage />}
                  />
                  <Route
                    path="/relatorio/itens-mais-vendidos"
                    element={<TopSellingReportsPage />}
                  />
                  <Route
                    path="/relatorio/ajustes-saldo"
                    element={<AdjustmentReportsPage />}
                  />
                </Route>

                <Route element={<PermissionGuard module="Caixa" />}>
                  <Route path="/caixa" element={<CaixaPage />} />
                </Route>

                <Route element={<PermissionGuard module="Inventário" />}>
                  <Route path="/inventario" element={<InventarioPage />} />
                  <Route
                    path="/inventario/contagem"
                    element={<ContagemPage />}
                  />
                </Route>

                <Route element={<PermissionGuard module="Permissões" />}>
                  <Route path="/permissoes" element={<PermissionsPage />} />
                </Route>

                {/* New Route */}
                <Route path="/complemento" element={<PlaceholderModule />} />
                <Route path="/vendas" element={<PlaceholderModule />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </PermissionsProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
