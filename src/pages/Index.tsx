import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Users,
  Briefcase,
  Package,
  Truck,
  Car,
  Handshake,
  ArrowDownCircle,
  CheckCircle,
  Lock,
  QrCode,
  Settings,
  Megaphone,
  FileText,
  AlertCircle,
  Map,
  Navigation,
  ClipboardList,
  List,
  BarChart3,
  CreditCard,
  CheckSquare,
  Barcode,
  Wallet,
  LayoutDashboard,
  Shield,
  Activity,
  UserX,
  Mail,
  Database,
  PieChart,
  PackageSearch,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function Index() {
  const sections = [
    {
      title: 'Operacional',
      items: [
        {
          title: 'Acerto',
          icon: Handshake,
          path: '/acerto',
          desc: 'Acerto com clientes',
        },
        { title: 'Rota', icon: Map, path: '/rota', desc: 'Gestão de rotas' },
        {
          title: 'Resumo Acertos',
          icon: List,
          path: '/resumo-acertos',
          desc: 'Relatório consolidado',
        },
        {
          title: 'Caixa',
          icon: Wallet,
          path: '/caixa',
          desc: 'Fluxo de caixa',
        },
        {
          title: 'Recebimento',
          icon: ArrowDownCircle,
          path: '/recebimento',
          desc: 'Entrada de valores',
        },
        {
          title: 'Pendências',
          icon: AlertCircle,
          path: '/pendencias',
          desc: 'Anotações e pendências',
        },
        {
          title: 'Rota Motoqueiro',
          icon: Navigation,
          path: '/rota-motoqueiro',
          desc: 'Rotas de cobrança',
        },
      ],
    },
    {
      title: 'Financeiro',
      items: [
        {
          title: 'Cobrança',
          icon: Megaphone,
          path: '/cobranca',
          desc: 'Gestão de inadimplência',
        },
        {
          title: 'Dívida Manual',
          icon: CreditCard,
          path: '/dividas-manuais',
          desc: 'Central de Dívida',
        },
        { title: 'Pix', icon: QrCode, path: '/pix', desc: 'Validação de Pix' },
        {
          title: 'Fechamentos',
          icon: Lock,
          path: '/fechamentos',
          desc: 'Fechamento de caixa',
        },
        {
          title: 'Nota Fiscal',
          icon: FileText,
          path: '/nota-fiscal',
          desc: 'Emissão de NFe',
        },
        {
          title: 'Boletos',
          icon: Barcode,
          path: '/boletos',
          desc: 'Controle de boletos',
        },
        {
          title: 'Quita Dívida',
          icon: CheckSquare,
          path: '/quitar-divida',
          desc: 'Gerenciar pagamentos',
        },
      ],
    },
    {
      title: 'Estoque e Frota',
      items: [
        {
          title: 'Inventário',
          icon: ClipboardList,
          path: '/inventario',
          desc: 'Contagem de estoque',
        },
        {
          title: 'Estoque Carro',
          icon: PackageSearch,
          path: '/estoque-carro',
          desc: 'Estoque nos veículos',
        },
        {
          title: 'INATIVAR CLIENTES',
          icon: UserX,
          path: '/inativar-clientes',
          desc: 'Gerenciar inativos',
        },
      ],
    },
    {
      title: 'Gerencial',
      items: [
        {
          title: 'DRE',
          icon: BarChart3,
          path: '/dre',
          desc: 'Resultados (DRE)',
        },
        {
          title: 'Relatórios',
          icon: PieChart,
          path: '/relatorio',
          desc: 'Central de relatórios',
        },
        {
          title: 'Controles',
          icon: LayoutDashboard,
          path: '/dashboard',
          desc: 'Visão geral do sistema',
        },
        {
          title: 'Confirmação',
          icon: CheckCircle,
          path: '/confirmacao-recebimentos',
          desc: 'Confirmação financeira',
        },
        {
          title: 'Indicadores',
          icon: Activity,
          path: '/indicadores',
          desc: 'KPIs e metas',
        },
      ],
    },
    {
      title: 'Sistema',
      items: [
        {
          title: 'E-mail Seguro',
          icon: Mail,
          path: '/email-seguro',
          desc: 'Configurações de envio',
        },
        {
          title: 'Permissões',
          icon: Shield,
          path: '/permissoes',
          desc: 'Controle de acessos',
        },
        {
          title: 'Backup',
          icon: Database,
          path: '/backup',
          desc: 'Exportação de dados',
        },
        {
          title: 'Controle',
          icon: Settings,
          path: '/controle',
          desc: 'Painel de controle',
        },
      ],
    },
    {
      title: 'Cadastro',
      items: [
        {
          title: 'Clientes',
          icon: Users,
          path: '/clientes',
          desc: 'Base de clientes',
        },
        {
          title: 'Funcionários',
          icon: Briefcase,
          path: '/funcionarios',
          desc: 'Gestão da equipe',
        },
        {
          title: 'Produtos',
          icon: Package,
          path: '/produtos',
          desc: 'Catálogo de produtos',
        },
        {
          title: 'Fornecedores',
          icon: Truck,
          path: '/fornecedores',
          desc: 'Gestão de fornecedores',
        },
        {
          title: 'Veículos',
          icon: Car,
          path: '/veiculos',
          desc: 'Controle de frota',
        },
      ],
    },
  ]

  const sectionColors: Record<string, string> = {
    Operacional:
      'border-blue-500/40 hover:border-blue-500/70 shadow-blue-500/10',
    Financeiro:
      'border-orange-500/40 hover:border-orange-500/70 shadow-orange-500/10',
    'Estoque e Frota':
      'border-orange-500/40 hover:border-orange-500/70 shadow-orange-500/10',
    Gerencial:
      'border-zinc-800/40 hover:border-zinc-800/70 shadow-zinc-800/10 dark:border-zinc-300/40 dark:hover:border-zinc-300/70',
    Sistema:
      'border-slate-500/40 hover:border-slate-500/70 shadow-slate-500/10',
    Cadastro: 'border-red-500/40 hover:border-red-500/70 shadow-red-500/10',
  }

  return (
    <div className="p-6 animate-fade-in pb-20 max-w-[1400px] mx-auto">
      <h1 className="text-3xl font-bold mb-2 text-primary">Menu Principal</h1>
      <p className="text-muted-foreground mb-8">
        Acesse rapidamente as funcionalidades organizadas por seção.
      </p>

      <div className="space-y-10">
        {sections.map((section, idx) => (
          <div key={idx}>
            <h2 className="text-xl font-semibold mb-4 text-foreground border-b pb-2 flex items-center">
              {section.title}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {section.items.map((c) => (
                <Link key={c.path} to={c.path}>
                  <Card
                    className={cn(
                      'hover:shadow-md transition-shadow cursor-pointer h-full group flex flex-col bg-card/50 hover:bg-card border-2',
                      sectionColors[section.title] ||
                        'border-primary/20 hover:border-primary/50',
                    )}
                  >
                    <CardHeader className="p-4 pb-2 flex-row items-center gap-3 space-y-0">
                      <div className="p-2 bg-muted rounded-md group-hover:bg-primary/10 transition-colors shrink-0">
                        <c.icon className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle className="text-sm font-semibold group-hover:text-primary transition-colors leading-tight">
                        {c.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 flex-1">
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {c.desc}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
