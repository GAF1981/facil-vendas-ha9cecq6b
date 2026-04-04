import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  LayoutDashboard,
  CheckSquare,
  CreditCard,
  Users,
  FileText,
  Map,
  Wallet,
  Briefcase,
  Barcode,
  ArrowDownCircle,
} from 'lucide-react'

export default function Index() {
  const cards = [
    {
      title: 'Painel Geral',
      icon: LayoutDashboard,
      path: '/dashboard',
      desc: 'Visão geral e atalhos do sistema',
    },
    {
      title: 'Quitar Dívida',
      icon: CheckSquare,
      path: '/quitar-divida',
      desc: 'Gerenciar pagamentos e baixar dívidas',
    },
    {
      title: 'Dívidas Manuais',
      icon: CreditCard,
      path: '/dividas-manuais',
      desc: 'Controle de dívidas extras',
    },
    {
      title: 'Rota',
      icon: Map,
      path: '/rota',
      desc: 'Acompanhamento de rotas e visitas',
    },
    {
      title: 'Recebimento',
      icon: ArrowDownCircle,
      path: '/recebimento',
      desc: 'Entrada de valores',
    },
    {
      title: 'Boletos',
      icon: Barcode,
      path: '/boletos',
      desc: 'Controle de boletos gerados',
    },
    {
      title: 'Caixa',
      icon: Wallet,
      path: '/caixa',
      desc: 'Gestão de fluxo de caixa',
    },
    {
      title: 'Clientes',
      icon: Users,
      path: '/clientes',
      desc: 'Gerenciamento da base de clientes',
    },
    {
      title: 'Funcionários',
      icon: Briefcase,
      path: '/funcionarios',
      desc: 'Gestão da equipe',
    },
    {
      title: 'Relatórios',
      icon: FileText,
      path: '/relatorio',
      desc: 'Acesso aos relatórios gerais',
    },
  ]

  return (
    <div className="p-6 animate-fade-in pb-20">
      <h1 className="text-3xl font-bold mb-2 text-primary">Menu Principal</h1>
      <p className="text-muted-foreground mb-8">
        Acesse rapidamente as principais funcionalidades do sistema.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Link key={c.path} to={c.path}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-primary/10 hover:border-primary/30 h-full group">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors">
                  {c.title}
                </CardTitle>
                <div className="p-2 bg-muted rounded-md group-hover:bg-primary/10 transition-colors">
                  <c.icon className="h-5 w-5 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{c.desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
