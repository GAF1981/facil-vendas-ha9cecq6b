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
} from 'lucide-react'
import { usePermissions } from '@/hooks/use-permissions'
import { useUserStore } from '@/stores/useUserStore'

export default function Index() {
  const { canAccess } = usePermissions()
  const { employee } = useUserStore()

  const quickLinks = [
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
      title: 'Recebimento',
      icon: ArrowDownCircle,
      href: '/recebimento',
      module: 'Recebimento',
      color: 'bg-green-500',
    },
    {
      title: 'DRE',
      icon: BarChart4,
      href: '/dre',
      module: 'DRE',
      color: 'bg-purple-500',
    },
    {
      title: 'Caixa',
      icon: Wallet,
      href: '/caixa',
      module: 'Caixa',
      color: 'bg-emerald-500',
    },
    {
      title: 'Clientes',
      icon: Users,
      href: '/clientes',
      module: 'Clientes',
      color: 'bg-orange-500',
    },
    {
      title: 'Produtos',
      icon: Package,
      href: '/produtos',
      module: 'Produtos',
      color: 'bg-amber-500',
    },
    {
      title: 'Cobrança',
      icon: CreditCard,
      href: '/cobranca',
      module: 'Cobrança',
      color: 'bg-rose-500',
    },
    {
      title: 'Nota Fiscal',
      icon: FileText,
      href: '/nota-fiscal',
      module: 'Nota Fiscal',
      color: 'bg-sky-500',
    },
    {
      title: 'E-mail Seguro',
      icon: Mail,
      href: '/email-seguro',
      module: 'Email Seguro',
      color: 'bg-zinc-700',
    },
    {
      title: 'Fechamentos',
      icon: Lock,
      href: '/fechamentos',
      module: 'Fechamentos',
      color: 'bg-slate-800',
    },
  ]

  const visibleLinks = quickLinks.filter((link) => {
    if (link.module === 'Email Seguro') return true
    return canAccess(link.module)
  })

  return (
    <div className="space-y-6 animate-fade-in p-4 sm:p-8 max-w-7xl mx-auto pb-24">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Menu Principal</h1>
        <p className="text-muted-foreground">
          Bem-vindo, {employee?.nome_completo || 'Usuário'}! Selecione uma opção
          abaixo.
        </p>
      </div>

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
                <span className="font-medium text-sm">{link.title}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
