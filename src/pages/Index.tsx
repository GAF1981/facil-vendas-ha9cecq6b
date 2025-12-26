import { MobileNavCard } from '@/components/home/MobileNavCard'
import {
  Users,
  Briefcase,
  Scale,
  PlusCircle,
  ArrowDownCircle,
  FileText,
  Wallet,
  CreditCard,
  ClipboardList,
  Map,
  BarChart3,
  AlertCircle,
  Package,
} from 'lucide-react'

const Index = () => {
  // Navigation Hub for all devices

  const modules = [
    {
      title: 'Clientes',
      description: 'Gestão de clientes',
      icon: Users,
      to: '/clientes',
      color: 'text-blue-600',
    },
    {
      title: 'Funcionários',
      description: 'Gestão de equipe',
      icon: Briefcase,
      to: '/funcionarios',
      color: 'text-indigo-600',
    },
    {
      title: 'Produtos',
      description: 'Catálogo de produtos',
      icon: Package,
      to: '/produtos',
      color: 'text-orange-600',
    },
    {
      title: 'Acerto',
      description: 'Acertos e ajustes',
      icon: Scale,
      to: '/acerto',
      color: 'text-teal-600',
    },
    {
      title: 'Complemento',
      description: 'Informações extras',
      icon: PlusCircle,
      to: '/complemento',
      color: 'text-cyan-600',
    },
    {
      title: 'Recebimento',
      description: 'Contas a receber',
      icon: ArrowDownCircle,
      to: '/recebimento',
      color: 'text-emerald-600',
    },
    {
      title: 'Nota Fiscal',
      description: 'Emissão de NF-e',
      icon: FileText,
      to: '/nota-fiscal',
      color: 'text-yellow-600',
    },
    {
      title: 'Caixa',
      description: 'Fluxo de caixa',
      icon: Wallet,
      to: '/caixa',
      color: 'text-green-600',
    },
    {
      title: 'Cobrança',
      description: 'Gestão de cobranças',
      icon: CreditCard,
      to: '/cobranca',
      color: 'text-red-600',
    },
    {
      title: 'Inventário',
      description: 'Controle de estoque',
      icon: ClipboardList,
      to: '/inventario',
      color: 'text-purple-600',
    },
    {
      title: 'Rota',
      description: 'Logística e rotas',
      icon: Map,
      to: '/rota',
      color: 'text-pink-600',
    },
    {
      title: 'Relatório',
      description: 'Análise e métricas',
      icon: BarChart3,
      to: '/relatorio',
      color: 'text-sky-600',
    },
    {
      title: 'Pendências',
      description: 'Itens pendentes',
      icon: AlertCircle,
      to: '/pendencias',
      color: 'text-amber-600',
    },
  ]

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col items-center justify-center py-6 space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-primary">
          FACIL VENDAS
        </h1>
        <p className="text-muted-foreground text-center max-w-lg">
          Bem-vindo ao sistema central. Selecione um módulo abaixo para começar.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-2">
        {modules.map((module) => (
          <MobileNavCard
            key={module.title}
            title={module.title}
            description={module.description}
            icon={module.icon}
            to={module.to}
            iconColor={module.color}
          />
        ))}
      </div>
    </div>
  )
}

export default Index
