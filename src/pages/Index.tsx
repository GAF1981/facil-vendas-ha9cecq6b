import { MobileNavCard } from '@/components/home/MobileNavCard'
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
  AlertCircle,
  Package,
  Database,
  QrCode,
  FileBarChart,
} from 'lucide-react'

export default function Index() {
  const modules = [
    {
      title: 'Clientes',
      icon: Users,
      to: '/clientes',
      description: 'Gerenciar cadastro e histórico de clientes',
      color: 'text-blue-600',
    },
    {
      title: 'Funcionários',
      icon: Briefcase,
      to: '/funcionarios',
      description: 'Gestão da equipe de vendas',
      color: 'text-indigo-600',
    },
    {
      title: 'Produtos',
      icon: Package,
      to: '/produtos',
      description: 'Catálogo de produtos e preços',
      color: 'text-amber-600',
    },
    {
      title: 'Acerto',
      icon: Scale,
      to: '/acerto',
      description: 'Realizar acertos e captações de vendas',
      color: 'text-green-600',
    },
    {
      title: 'Recebimento',
      icon: ArrowDownCircle,
      to: '/recebimento',
      description: 'Registrar recebimentos de valores',
      color: 'text-emerald-600',
    },
    {
      title: 'Pix',
      icon: QrCode,
      to: '/pix',
      description: 'Conferência de recebimentos via Pix',
      color: 'text-purple-600',
    },
    // Confirmação Removed
    {
      title: 'Cobrança',
      icon: CreditCard,
      to: '/cobranca',
      description: 'Gestão de cobranças e inadimplência',
      color: 'text-red-600',
    },
    {
      title: 'Nota Fiscal',
      icon: FileText,
      to: '/nota-fiscal',
      description: 'Controle de emissão de notas fiscais',
      color: 'text-orange-600',
    },
    {
      title: 'Caixa',
      icon: Wallet,
      to: '/caixa',
      description: 'Fluxo de caixa e movimentações',
      color: 'text-cyan-600',
    },
    {
      title: 'Inventário',
      icon: ClipboardList,
      to: '/inventario',
      description: 'Controle de estoque e inventário',
      color: 'text-violet-600',
    },
    {
      title: 'Rota',
      icon: Map,
      to: '/rota',
      description: 'Planejamento e gestão de rotas',
      color: 'text-fuchsia-600',
    },
    {
      title: 'Resumo Acertos',
      icon: FileBarChart,
      to: '/resumo-acertos',
      description: 'Monitoramento consolidado de acertos',
      color: 'text-indigo-600',
    },
    {
      title: 'Relatório',
      icon: BarChart3,
      to: '/relatorio',
      description: 'Relatórios gerenciais e estatísticas',
      color: 'text-rose-600',
    },
    {
      title: 'Pendências',
      icon: AlertCircle,
      to: '/pendencias',
      description: 'Acompanhamento de pendências',
      color: 'text-yellow-600',
    },
    {
      title: 'Backup',
      icon: Database,
      to: '/backup',
      description: 'Exportação e backup de dados',
      color: 'text-slate-600',
    },
  ]

  return (
    <div className="space-y-6 animate-fade-in p-4 pb-20">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Menu Principal</h1>
        <p className="text-muted-foreground">
          Bem-vindo ao sistema Fácil Vendas. Selecione um módulo para começar.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {modules.map((module) => (
          <MobileNavCard
            key={module.title}
            {...module}
            iconColor={module.color}
          />
        ))}
      </div>
    </div>
  )
}
