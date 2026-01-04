import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  TrendingUp,
  Package,
  ShoppingCart,
  BarChart3,
  RotateCcw,
} from 'lucide-react'
import { Link } from 'react-router-dom'

const RelatorioDashboard = () => {
  const reports = [
    {
      title: 'Projeções',
      description: 'Projeções de vendas e médias por cliente.',
      icon: TrendingUp,
      to: '/relatorio/projecoes',
      color: 'text-blue-600',
      bg: 'bg-blue-100',
    },
    {
      title: 'Vendas',
      description: 'Histórico detalhado de vendas e faturamento.',
      icon: ShoppingCart,
      to: '/relatorio/vendas',
      color: 'text-green-600',
      bg: 'bg-green-100',
    },
    {
      title: 'Estoque',
      description: 'Relatório de giro de estoque e produtos.',
      icon: Package,
      to: '/relatorio/estoque',
      color: 'text-orange-600',
      bg: 'bg-orange-100',
    },
    {
      title: 'Itens mais Vendidos',
      description: 'Análise de produtos com maior volume de vendas.',
      icon: BarChart3,
      to: '/relatorio/itens-mais-vendidos',
      color: 'text-purple-600',
      bg: 'bg-purple-100',
    },
    {
      title: 'Ajustes Saldo Inicial',
      description: 'Histórico de ajustes manuais de saldo inicial.',
      icon: RotateCcw,
      to: '/relatorio/ajustes-saldo',
      color: 'text-red-600',
      bg: 'bg-red-100',
    },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Relatórios Gerenciais
        </h1>
        <p className="text-muted-foreground">
          Selecione um módulo de relatório para visualizar dados detalhados.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {reports.map((report) => (
          <Link key={report.title} to={report.to}>
            <Card
              className="hover:shadow-md transition-shadow cursor-pointer h-full border-l-4 group"
              style={{ borderLeftColor: 'currentColor' }}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`p-2 rounded-lg ${report.bg} transition-transform group-hover:scale-110`}
                  >
                    <report.icon className={`w-5 h-5 ${report.color}`} />
                  </div>
                  <CardTitle className="text-lg">{report.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>{report.description}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default RelatorioDashboard
