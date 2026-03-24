import { Card, CardContent } from '@/components/ui/card'
import { Link } from 'react-router-dom'
import {
  Users,
  Map,
  Package,
  Wallet,
  FileText,
  BarChart4,
  Mail,
  Scale,
  ArrowDownCircle,
  CreditCard,
  Lock,
  Receipt,
  AlertCircle,
  Bike,
  Barcode,
  BarChart3,
  Car,
  UserX,
  ClipboardList,
  Truck,
  UserCog,
  PackageSearch,
  ShieldCheck,
  Database,
  Activity,
  QrCode,
} from 'lucide-react'
import { usePermissions } from '@/hooks/use-permissions'
import { useUserStore } from '@/stores/useUserStore'

export default function Index() {
  const { canAccess } = usePermissions()
  const { employee } = useUserStore()

  const sections = [
    {
      title: 'Operação',
      links: [
        {
          title: 'Acerto',
          icon: Scale,
          href: '/acerto',
          module: 'Acerto',
          color: 'bg-blue-500',
        },
        {
          title: 'Rota',
          icon: Map,
          href: '/rota',
          module: 'Rota',
          color: 'bg-indigo-500',
        },
        {
          title: 'Resumo Acertos',
          icon: Receipt,
          href: '/resumo-acertos',
          module: 'Resumo Acertos',
          color: 'bg-sky-500',
        },
        {
          title: 'Caixa',
          icon: Wallet,
          href: '/caixa',
          module: 'Caixa',
          color: 'bg-emerald-500',
        },
        {
          title: 'Recebimento',
          icon: ArrowDownCircle,
          href: '/recebimento',
          module: 'Recebimento',
          color: 'bg-green-500',
        },
        {
          title: 'Pendências',
          icon: AlertCircle,
          href: '/pendencias',
          module: 'Pendências',
          color: 'bg-amber-500',
        },
      ],
    },
    {
      title: 'Financeiro',
      links: [
        {
          title: 'Pix',
          icon: QrCode,
          href: '/pagamentos',
          module: 'Pagamentos',
          color: 'bg-teal-500',
        },
        {
          title: 'Cobrança',
          icon: CreditCard,
          href: '/cobranca',
          module: 'Cobrança',
          color: 'bg-rose-500',
        },
        {
          title: 'Rota Motoqueiro',
          icon: Bike,
          href: '/rota-motoqueiro',
          module: 'Rota Motoqueiro',
          color: 'bg-pink-500',
        },
        {
          title: 'Fechamentos',
          icon: Lock,
          href: '/fechamentos',
          module: 'Fechamentos',
          color: 'bg-slate-800',
        },
        {
          title: 'Nota Fiscal',
          icon: FileText,
          href: '/nota-fiscal',
          module: 'Nota Fiscal',
          color: 'bg-cyan-500',
        },
        {
          title: 'Boletos',
          icon: Barcode,
          href: '/boletos',
          module: 'Boletos',
          color: 'bg-fuchsia-500',
        },
      ],
    },
    {
      title: 'Controle',
      links: [
        {
          title: 'Relatório',
          icon: BarChart3,
          href: '/relatorio',
          module: 'Relatório',
          color: 'bg-violet-500',
        },
        {
          title: 'DRE',
          icon: BarChart4,
          href: '/dre',
          module: 'DRE',
          color: 'bg-purple-500',
        },
        {
          title: 'Veículos',
          icon: Car,
          href: '/veiculos',
          module: 'Veículos',
          color: 'bg-teal-500',
        },
        {
          title: 'INATIVAR CLIENTES',
          icon: UserX,
          href: '/inativar-clientes',
          module: 'Inativar Clientes',
          color: 'bg-red-600',
        },
      ],
    },
    {
      title: 'Estoque',
      links: [
        {
          title: 'Estoque Carro',
          icon: Package,
          href: '/estoque-carro',
          module: 'Inventário',
          color: 'bg-orange-500',
        },
        {
          title: 'Inventário Geral',
          icon: ClipboardList,
          href: '/inventario',
          module: 'Inventário',
          color: 'bg-yellow-600',
        },
      ],
    },
    {
      title: 'Cadastro',
      links: [
        {
          title: 'Clientes',
          icon: Users,
          href: '/clientes',
          module: 'Clientes',
          color: 'bg-orange-500',
        },
        {
          title: 'Fornecedores',
          icon: Truck,
          href: '/fornecedores',
          module: 'Fornecedores',
          color: 'bg-lime-600',
        },
        {
          title: 'Funcionários',
          icon: UserCog,
          href: '/funcionarios',
          module: 'Funcionários',
          color: 'bg-blue-600',
        },
        {
          title: 'Produtos',
          icon: PackageSearch,
          href: '/produtos',
          module: 'Produtos',
          color: 'bg-amber-600',
        },
      ],
    },
    {
      title: 'Sistema',
      links: [
        {
          title: 'E-mail Seguro',
          icon: Mail,
          href: '/email-seguro',
          module: 'Email Seguro',
          color: 'bg-zinc-700',
        },
        {
          title: 'Permissões',
          icon: ShieldCheck,
          href: '/permissoes',
          module: 'Permissões',
          color: 'bg-slate-700',
        },
        {
          title: 'Backup',
          icon: Database,
          href: '/backup',
          module: 'Backup',
          color: 'bg-stone-600',
        },
        {
          title: 'Indicadores',
          icon: Activity,
          href: '/indicadores',
          module: 'Indicadores',
          color: 'bg-blue-500',
        },
      ],
    },
  ]

  return (
    <div className="space-y-8 animate-fade-in p-4 sm:p-8 max-w-7xl mx-auto pb-24">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Menu Principal</h1>
        <div className="text-muted-foreground">
          Bem-vindo, {employee?.nome_completo || 'Usuário'}! Selecione uma opção
          abaixo.
        </div>
      </div>

      <div className="space-y-8">
        {sections.map((section) => {
          const visibleLinks = section.links.filter((link) => {
            if (link.module === 'Email Seguro') return true
            if (link.module === 'Fornecedores') return true // Public route
            return canAccess(link.module)
          })

          if (visibleLinks.length === 0) return null

          return (
            <div key={section.title} className="space-y-4">
              <h2 className="text-xl font-semibold tracking-tight border-b pb-2 text-foreground/80">
                {section.title}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {visibleLinks.map((link) => (
                  <Link key={link.href} to={link.href}>
                    <Card className="hover:bg-muted/50 transition-colors h-full border shadow-sm hover:shadow-md cursor-pointer group">
                      <CardContent className="flex flex-col items-center justify-center p-6 gap-4 text-center h-full">
                        <div
                          className={`p-3 rounded-full text-white ${link.color} group-hover:scale-110 transition-transform duration-300`}
                        >
                          <link.icon className="h-6 w-6" />
                        </div>
                        <span className="font-medium text-sm">
                          {link.title}
                        </span>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
