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
  BarChart4,
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
  Barcode,
  QrCode,
} from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { usePermissions } from '@/hooks/use-permissions'
import { useUserStore } from '@/stores/useUserStore'

export function AppSidebar() {
  const location = useLocation()
  const { setOpenMobile } = useSidebar()
  const { canAccess } = usePermissions()
  const { employee } = useUserStore()

  const categorizedItems = [
    {
      category: 'Principal',
      items: [
        {
          title: 'Menu Principal',
          url: '/',
          icon: LayoutDashboard,
          module: 'Menu',
        },
        {
          title: 'Indicadores',
          url: '/indicadores',
          icon: BarChart4,
          module: 'Indicadores',
        },
        {
          title: 'Relatório',
          url: '/relatorio',
          icon: BarChart3,
          module: 'Relatório',
        },
      ],
    },
    {
      category: 'Operacional',
      items: [
        { title: 'Rota', url: '/rota', icon: Map, module: 'Rota' },
        { title: 'Acerto', url: '/acerto', icon: Scale, module: 'Acerto' },
        {
          title: 'Recebimento',
          url: '/recebimento',
          icon: ArrowDownCircle,
          module: 'Recebimento',
        },
        {
          title: 'Pendências',
          url: '/pendencias',
          icon: AlertCircle,
          module: 'Pendências',
        },
        {
          title: 'INATIVAR CLIENTES',
          url: '/inativar-clientes',
          icon: UserX,
          module: 'Inativar Clientes',
        },
        {
          title: 'Rota Motoqueiro',
          url: '/rota-motoqueiro',
          icon: Bike,
          module: 'Rota Motoqueiro',
        },
      ],
    },
    {
      category: 'Financeiro',
      items: [
        { title: 'Caixa', url: '/caixa', icon: Wallet, module: 'Caixa' },
        {
          title: 'Pix',
          url: '/pagamentos',
          icon: QrCode,
          module: 'Pagamentos',
        },
        {
          title: 'Fechamentos',
          url: '/fechamentos',
          icon: Lock,
          module: 'Fechamentos',
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
        { title: 'Boletos', url: '/boletos', icon: Barcode, module: 'Boletos' },
        {
          title: 'Nota Fiscal',
          url: '/nota-fiscal',
          icon: FileText,
          module: 'Nota Fiscal',
        },
        { title: 'DRE', url: '/dre', icon: BarChart4, module: 'DRE' },
      ],
    },
    {
      category: 'Estoque & Frota',
      items: [
        {
          title: 'Inventário',
          url: '/inventario',
          icon: ClipboardList,
          module: 'Inventário',
        },
        {
          title: 'Estoque Carro',
          url: '/estoque-carro',
          icon: Car,
          module: 'Inventário',
        },
        { title: 'Veículos', url: '/veiculos', icon: Car, module: 'Veículos' },
      ],
    },
    {
      category: 'Cadastros',
      items: [
        {
          title: 'Clientes',
          url: '/clientes',
          icon: Users,
          module: 'Clientes',
        },
        {
          title: 'Produtos',
          url: '/produtos',
          icon: Package,
          module: 'Produtos',
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
      ],
    },
    {
      category: 'Sistema',
      items: [
        {
          title: 'e-mail seguro',
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
        { title: 'Backup', url: '/backup', icon: Database, module: 'Backup' },
      ],
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
        {categorizedItems.map((group) => {
          const visibleGroupItems = group.items.filter((item) => {
            if (item.module === 'Menu') return true
            if (item.module === 'Email Seguro') return true
            if (item.module === 'Permissões') {
              if (Array.isArray(employee?.setor)) {
                return employee?.setor.includes('Administrador')
              }
              return employee?.setor === 'Administrador'
            }
            return canAccess(item.module)
          })

          if (visibleGroupItems.length === 0) return null

          return (
            <SidebarGroup key={group.category}>
              <SidebarGroupLabel className="text-xs font-semibold text-primary/70 uppercase tracking-wider">
                {group.category}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleGroupItems.map((item) => (
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
          )
        })}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
