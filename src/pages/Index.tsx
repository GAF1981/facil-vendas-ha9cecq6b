import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
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
} from 'lucide-react'
import { usePermissions } from '@/hooks/use-permissions'
import { useUserStore } from '@/stores/useUserStore'

export default function Index() {
  const { canAccess } = usePermissions()
  const { employee } = useUserStore()

  const mainModules = [
    {
      title: 'Acerto',
      icon: Scale,
      color: 'text-indigo-500',
      bg: 'bg-indigo-50',
      to: '/acerto',
      module: 'Acerto',
    },
    {
      title: 'Rota',
      icon: Map,
      color: 'text-blue-500',
      bg: 'bg-blue-50',
      to: '/rota',
      module: 'Rota',
    },
    {
      title: 'Recebimento',
      icon: ArrowDownCircle,
      color: 'text-emerald-500',
      bg: 'bg-emerald-50',
      to: '/recebimento',
      module: 'Recebimento',
    },
    {
      title: 'Caixa',
      icon: Wallet,
      color: 'text-teal-500',
      bg: 'bg-teal-50',
      to: '/caixa',
      module: 'Caixa',
    },
    {
      title: 'DRE',
      icon: BarChart4,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      to: '/dre',
      module: 'DRE',
    },
    {
      title: 'Estoque Carro',
      icon: Car,
      color: 'text-orange-500',
      bg: 'bg-orange-50',
      to: '/estoque-carro',
      module: 'Inventário',
    },
    {
      title: 'Resumo Acertos',
      icon: FileBarChart,
      color: 'text-cyan-500',
      bg: 'bg-cyan-50',
      to: '/resumo-acertos',
      module: 'Resumo Acertos',
    },
    {
      title: 'Rota Motoqueiro',
      icon: Bike,
      color: 'text-fuchsia-500',
      bg: 'bg-fuchsia-50',
      to: '/rota-motoqueiro',
      module: 'Rota Motoqueiro',
    },
    {
      title: 'Boletos',
      icon: Barcode,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      to: '/boletos',
      module: 'Boletos',
    },
    {
      title: 'Cobrança',
      icon: CreditCard,
      color: 'text-red-500',
      bg: 'bg-red-50',
      to: '/cobranca',
      module: 'Cobrança',
    },
    {
      title: 'Nota Fiscal',
      icon: FileText,
      color: 'text-violet-500',
      bg: 'bg-violet-50',
      to: '/nota-fiscal',
      module: 'Nota Fiscal',
    },
    {
      title: 'Fechamentos',
      icon: Lock,
      color: 'text-slate-500',
      bg: 'bg-slate-100',
      to: '/fechamentos',
      module: 'Fechamentos',
    },
    {
      title: 'INATIVAR CLIENTES',
      icon: UserX,
      color: 'text-rose-500',
      bg: 'bg-rose-50',
      to: '/inativar-clientes',
      module: 'Inativar Clientes',
    },
    {
      title: 'Pendências',
      icon: AlertCircle,
      color: 'text-amber-500',
      bg: 'bg-amber-50',
      to: '/pendencias',
      module: 'Pendências',
    },
    {
      title: 'Inventário',
      icon: ClipboardList,
      color: 'text-lime-500',
      bg: 'bg-lime-50',
      to: '/inventario',
      module: 'Inventário',
    },
    {
      title: 'Relatório',
      icon: BarChart3,
      color: 'text-sky-500',
      bg: 'bg-sky-50',
      to: '/relatorio',
      module: 'Relatório',
    },
    {
      title: 'e-mail seguro',
      icon: Mail,
      color: 'text-green-600',
      bg: 'bg-green-50',
      to: '/email-seguro',
      module: 'Email Seguro',
    },
    {
      title: 'Permissões',
      icon: Settings,
      color: 'text-zinc-600',
      bg: 'bg-zinc-100',
      to: '/permissoes',
      module: 'Permissões',
    },
    {
      title: 'Veículos',
      icon: Car,
      color: 'text-gray-500',
      bg: 'bg-gray-100',
      to: '/veiculos',
      module: 'Veículos',
    },
    {
      title: 'Backup',
      icon: Database,
      color: 'text-stone-500',
      bg: 'bg-stone-100',
      to: '/backup',
      module: 'Backup',
    },
  ]

  const registrationModules = [
    {
      title: 'Clientes',
      icon: Users,
      color: 'text-blue-500',
      bg: 'bg-blue-50',
      to: '/clientes',
      module: 'Clientes',
    },
    {
      title: 'Fornecedores',
      icon: Truck,
      color: 'text-orange-500',
      bg: 'bg-orange-50',
      to: '/fornecedores',
      module: 'Produtos',
    },
    {
      title: 'Funcionários',
      icon: Briefcase,
      color: 'text-indigo-500',
      bg: 'bg-indigo-50',
      to: '/funcionarios',
      module: 'Funcionários',
    },
    {
      title: 'Produtos',
      icon: Package,
      color: 'text-emerald-500',
      bg: 'bg-emerald-50',
      to: '/produtos',
      module: 'Produtos',
    },
  ]

  const visibleMainModules = mainModules.filter((m) => {
    if (m.module === 'Permissões') {
      if (Array.isArray(employee?.setor)) {
        return employee?.setor.includes('Administrador')
      }
      return employee?.setor === 'Administrador'
    }
    if (m.module === 'Email Seguro') return true
    return canAccess(m.module)
  })

  const visibleRegistrationModules = registrationModules.filter((m) =>
    canAccess(m.module),
  )

  return (
    <div className="space-y-8 animate-fade-in p-2 sm:p-6 pb-20">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Menu Principal
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Acesse os módulos do sistema.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold border-b pb-2">Módulos</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {visibleMainModules.map((module) => (
            <Link key={module.to} to={module.to} className="block group">
              <Card className="h-full transition-all duration-200 hover:shadow-md hover:border-primary/50 group-hover:-translate-y-1">
                <CardContent className="p-4 sm:p-6 flex flex-col items-center justify-center text-center space-y-3 h-full">
                  <div
                    className={`${module.bg} p-3 sm:p-4 rounded-full transition-colors group-hover:bg-primary/10`}
                  >
                    <module.icon
                      className={`w-6 h-6 sm:w-8 sm:h-8 ${module.color}`}
                    />
                  </div>
                  <h3 className="font-medium text-xs sm:text-sm uppercase tracking-wide">
                    {module.title}
                  </h3>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {visibleRegistrationModules.length > 0 && (
        <div className="space-y-4 pt-4">
          <h2 className="text-xl font-semibold border-b pb-2">Cadastros</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {visibleRegistrationModules.map((module) => (
              <Link key={module.to} to={module.to} className="block group">
                <Card className="h-full transition-all duration-200 hover:shadow-md hover:border-primary/50 group-hover:-translate-y-1">
                  <CardContent className="p-4 sm:p-6 flex flex-col items-center justify-center text-center space-y-3 h-full">
                    <div
                      className={`${module.bg} p-3 sm:p-4 rounded-full transition-colors group-hover:bg-primary/10`}
                    >
                      <module.icon
                        className={`w-6 h-6 sm:w-8 sm:h-8 ${module.color}`}
                      />
                    </div>
                    <h3 className="font-medium text-xs sm:text-sm uppercase tracking-wide">
                      {module.title}
                    </h3>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
