import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Scale,
  ArrowDownCircle,
  FileText,
  Wallet,
  CreditCard,
  ClipboardList,
  Map,
  BarChart3,
  AlertCircle,
  Package,
  Database,
  FileBarChart,
  Settings,
  Lock,
  Truck,
  Car,
  UserX,
  Bike,
  Mail,
} from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { usePermissions } from '@/hooks/use-permissions'
import { useUserStore } from '@/stores/useUserStore'

export function AppSidebar() {
  const location = useLocation()
  const { setOpenMobile } = useSidebar()
  const { canAccess } = usePermissions()
  const { employee } = useUserStore()

  // Order matching Main Menu
  const items = [
    {
      title: 'Menu Principal',
      url: '/',
      icon: LayoutDashboard,
      module: 'Menu',
    },
    {
      title: 'Acerto',
      url: '/acerto',
      icon: Scale,
      module: 'Acerto',
    },
    {
      title: 'Rota',
      url: '/rota',
      icon: Map,
      module: 'Rota',
    },
    {
      title: 'Recebimento',
      url: '/recebimento',
      icon: ArrowDownCircle,
      module: 'Recebimento',
    },
    {
      title: 'Caixa',
      url: '/caixa',
      icon: Wallet,
      module: 'Caixa',
    },
    {
      title: 'Rota Motoqueiro',
      url: '/rota-motoqueiro',
      icon: Bike,
      module: 'Rota Motoqueiro',
    },
    {
      title: 'Estoque Carro',
      url: '/estoque-carro',
      icon: Car,
      module: 'Inventário',
    },
    {
      title: 'Veículos',
      url: '/veiculos',
      icon: Car,
      module: 'Veículos',
    },
    {
      title: 'Resumo Acertos',
      url: '/resumo-acertos',
      icon: FileBarChart,
      module: 'Resumo Acertos',
    },
    {
      title: 'Cobrança',
      url: '/cobranca',
      icon: CreditCard,
      module: 'Cobrança',
    },
    {
      title: 'Nota Fiscal',
      url: '/nota-fiscal',
      icon: FileText,
      module: 'Nota Fiscal',
    },
    {
      title: 'Fechamentos',
      url: '/fechamentos',
      icon: Lock,
      module: 'Fechamentos',
    },
    {
      title: 'INATIVAR CLIENTES',
      url: '/inativar-clientes',
      icon: UserX,
      module: 'Inativar Clientes',
    },
    {
      title: 'Pendências',
      url: '/pendencias',
      icon: AlertCircle,
      module: 'Pendências',
    },
    {
      title: 'Inventário',
      url: '/inventario',
      icon: ClipboardList,
      module: 'Inventário',
    },
    {
      title: 'Relatório',
      url: '/relatorio',
      icon: BarChart3,
      module: 'Relatório',
    },
    {
      title: 'E-mail Seguro',
      url: '/email-seguro',
      icon: Mail,
      module: 'Email Seguro',
    },
    {
      title: 'Permissões',
      url: '/permissoes',
      icon: Settings,
      module: 'Permissões',
    },
    {
      title: 'Backup',
      url: '/backup',
      icon: Database,
      module: 'Backup',
    },
    {
      title: 'Clientes',
      url: '/clientes',
      icon: Users,
      module: 'Clientes',
    },
    {
      title: 'Fornecedores',
      url: '/fornecedores',
      icon: Truck,
      module: 'Produtos',
    },
    {
      title: 'Funcionários',
      url: '/funcionarios',
      icon: Briefcase,
      module: 'Funcionários',
    },
    {
      title: 'Produtos',
      url: '/produtos',
      icon: Package,
      module: 'Produtos',
    },
  ]

  const visibleItems = items.filter((item) => {
    if (item.module === 'Menu') return true
    if (item.module === 'Email Seguro') return true // Allow access by default for now
    if (item.module === 'Permissões') {
      if (Array.isArray(employee?.setor)) {
        return employee?.setor.includes('Administrador')
      }
      return employee?.setor === 'Administrador'
    }
    return canAccess(item.module)
  })

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center justify-center py-4 group-data-[collapsible=icon]:hidden">
          <h1 className="text-xl font-bold text-primary">FACIL VENDAS</h1>
        </div>
        <div className="flex items-center justify-center py-4 hidden group-data-[collapsible=icon]:flex">
          <h1 className="text-xl font-bold text-primary">FV</h1>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      location.pathname === item.url ||
                      (item.url !== '/' &&
                        location.pathname.startsWith(item.url))
                    }
                    tooltip={item.title}
                    onClick={() => setOpenMobile(false)}
                  >
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
