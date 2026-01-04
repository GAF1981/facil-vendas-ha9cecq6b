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
  QrCode,
  FileBarChart,
  Settings,
  Lock,
} from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { usePermissions } from '@/hooks/use-permissions'
import { useUserStore } from '@/stores/useUserStore'

export function AppSidebar() {
  const location = useLocation()
  const { setOpenMobile } = useSidebar()
  const { canAccess } = usePermissions()
  const { employee } = useUserStore()

  const items = [
    {
      title: 'Menu Principal',
      url: '/',
      icon: LayoutDashboard,
      module: 'Menu', // Always visible
    },
    {
      title: 'Clientes',
      url: '/clientes',
      icon: Users,
      module: 'Clientes',
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
    {
      title: 'Acerto',
      url: '/acerto',
      icon: Scale,
      module: 'Acerto',
    },
    {
      title: 'Recebimento',
      url: '/recebimento',
      icon: ArrowDownCircle,
      module: 'Recebimento',
    },
    {
      title: 'Pix',
      url: '/pix',
      icon: QrCode,
      module: 'Pix',
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
      title: 'Caixa',
      url: '/caixa',
      icon: Wallet,
      module: 'Caixa',
    },
    {
      title: 'Fechamentos',
      url: '/fechamentos',
      icon: Lock,
      module: 'Fechamentos',
    },
    {
      title: 'Inventário',
      url: '/inventario',
      icon: ClipboardList,
      module: 'Inventário',
    },
    {
      title: 'Rota',
      url: '/rota',
      icon: Map,
      module: 'Rota',
    },
    {
      title: 'Resumo de Acertos',
      url: '/resumo-acertos',
      icon: FileBarChart,
      module: 'Resumo Acertos',
    },
    {
      title: 'Relatório',
      url: '/relatorio',
      icon: BarChart3,
      module: 'Relatório',
    },
    {
      title: 'Pendências',
      url: '/pendencias',
      icon: AlertCircle,
      module: 'Pendências',
    },
    {
      title: 'Backup e Exportação',
      url: '/backup',
      icon: Database,
      module: 'Backup',
    },
    {
      title: 'Permissões',
      url: '/permissoes',
      icon: Settings,
      module: 'Permissões',
    },
  ]

  const visibleItems = items.filter((item) => {
    if (item.module === 'Menu') return true
    if (item.module === 'Permissões') {
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
