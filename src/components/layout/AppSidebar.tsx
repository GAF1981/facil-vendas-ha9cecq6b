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
  CheckCircle,
  QrCode,
} from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

export function AppSidebar() {
  const location = useLocation()
  const { setOpenMobile } = useSidebar()

  const items = [
    {
      title: 'Menu Principal',
      url: '/',
      icon: LayoutDashboard,
    },
    {
      title: 'Clientes',
      url: '/clientes',
      icon: Users,
    },
    {
      title: 'Funcionários',
      url: '/funcionarios',
      icon: Briefcase,
    },
    {
      title: 'Produtos',
      url: '/produtos',
      icon: Package,
    },
    {
      title: 'Acerto',
      url: '/acerto',
      icon: Scale,
    },
    {
      title: 'Recebimento',
      url: '/recebimento',
      icon: ArrowDownCircle,
    },
    {
      title: 'Pix',
      url: '/pix',
      icon: QrCode,
    },
    {
      title: 'Confirmação',
      url: '/confirmacao-recebimentos',
      icon: CheckCircle,
    },
    {
      title: 'Cobrança',
      url: '/cobranca',
      icon: CreditCard,
    },
    {
      title: 'Nota Fiscal',
      url: '/nota-fiscal',
      icon: FileText,
    },
    {
      title: 'Caixa',
      url: '/caixa',
      icon: Wallet,
    },
    {
      title: 'Inventário',
      url: '/inventario',
      icon: ClipboardList,
    },
    {
      title: 'Rota',
      url: '/rota',
      icon: Map,
    },
    {
      title: 'Relatório',
      url: '/relatorio',
      icon: BarChart3,
    },
    {
      title: 'Pendências',
      url: '/pendencias',
      icon: AlertCircle,
    },
    {
      title: 'Backup e Exportação',
      url: '/backup',
      icon: Database,
    },
  ]

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
              {items.map((item) => (
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
