import { useEffect, useState } from 'react'
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
  CreditCard,
  ClipboardList,
  UserX,
  Fuel,
  Upload,
  Gift,
  Mail,
  Loader2,
  Target,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useUserStore } from '@/stores/useUserStore'
import { rotaService } from '@/services/rotaService'
import { caixaService } from '@/services/caixaService'
import { reportsService } from '@/services/reportsService'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'

const RelatorioDashboard = () => {
  const { employee } = useUserStore()
  const [showNewRoutePrompt, setShowNewRoutePrompt] = useState(false)
  const [currentRouteId, setCurrentRouteId] = useState<number | null>(null)
  const [sendingEmail, setSendingEmail] = useState(false)
  const { toast } = useToast()

  // Check if admin for Import Card visibility
  const userSectors = Array.isArray(employee?.setor)
    ? employee.setor
    : [employee?.setor]
  const isAdmin = userSectors.includes('Administrador')

  useEffect(() => {
    const checkAllClosed = async () => {
      try {
        const activeRota = await rotaService.getActiveRota()
        if (!activeRota) return

        setCurrentRouteId(activeRota.id)

        const summaries = await caixaService.getFinancialSummary(activeRota)

        if (summaries.length === 0) return

        const allClosed = summaries.every((s) => s.statusCaixa === 'Fechado')

        if (allClosed) {
          setShowNewRoutePrompt(true)
        }
      } catch (e) {
        console.error('Error checking route status', e)
      }
    }

    checkAllClosed()
  }, [])

  const handleStartNewRoute = async () => {
    if (!currentRouteId) return

    try {
      await rotaService.finishAndStartNewRoute(currentRouteId)
      toast({
        title: 'Nova Rota Iniciada',
        description: 'A rota anterior foi finalizada e uma nova foi aberta.',
        className: 'bg-green-600 text-white',
      })
      setShowNewRoutePrompt(false)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Não foi possível iniciar uma nova rota.',
        variant: 'destructive',
      })
    }
  }

  const handleSendEmailReport = async () => {
    if (!employee?.email) {
      toast({
        title: 'Erro',
        description: 'Usuário não possui e-mail configurado.',
        variant: 'destructive',
      })
      return
    }

    setSendingEmail(true)
    try {
      await reportsService.sendConsolidatedEmail(employee.email)
      toast({
        title: 'Sucesso',
        description: 'Relatórios enviados por e-mail com sucesso!',
        className: 'bg-green-600 text-white',
      })
    } catch (error: any) {
      console.error(error)
      toast({
        title: 'Erro ao enviar relatórios',
        description: error.message || 'Ocorreu um erro inesperado.',
        variant: 'destructive',
      })
    } finally {
      setSendingEmail(false)
    }
  }

  const reports = [
    {
      title: 'Estoque Geral',
      description: 'Métricas de diferenças e compras do inventário.',
      icon: ClipboardList,
      to: '/relatorio/estoque-geral',
      color: 'text-violet-600',
      bg: 'bg-violet-100',
    },
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
      title: 'Relatório de Débitos',
      description: 'Acompanhamento histórico de dívidas e pagamentos.',
      icon: CreditCard,
      to: '/relatorio/debitos',
      color: 'text-red-600',
      bg: 'bg-red-100',
    },
    {
      title: 'Metas',
      description:
        'Acompanhamento de metas diárias de acertos por funcionário.',
      icon: Target,
      to: '/relatorio/metas',
      color: 'text-indigo-600',
      bg: 'bg-indigo-100',
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
      title: 'Combustível',
      description: 'Análise de consumo e custo por quilômetro.',
      icon: Fuel,
      to: '/relatorio/combustivel',
      color: 'text-orange-600',
      bg: 'bg-orange-100',
    },
    {
      title: 'Ajustes Saldo Inicial',
      description: 'Histórico de ajustes manuais de saldo inicial.',
      icon: RotateCcw,
      to: '/relatorio/ajustes-saldo',
      color: 'text-slate-600',
      bg: 'bg-slate-100',
    },
    {
      title: 'INATIVAR CLIENTES',
      description: 'Lista de clientes pendentes de inativação.',
      icon: UserX,
      to: '/inativar-clientes',
      color: 'text-red-700',
      bg: 'bg-red-100',
    },
    {
      title: 'Brinde',
      description: 'Histórico de brindes entregues aos clientes.',
      icon: Gift,
      to: '/relatorio/brinde',
      color: 'text-purple-600',
      bg: 'bg-purple-100',
    },
  ]

  // Add Import card only if Admin
  if (isAdmin) {
    reports.push({
      title: 'Importação de Saldo Inicial',
      description: 'Migração de saldo inicial de clientes via CSV.',
      icon: Upload,
      to: '/relatorio/importacao-saldo',
      color: 'text-blue-700',
      bg: 'bg-blue-100',
    })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Relatórios Gerenciais
          </h1>
          <p className="text-muted-foreground">
            Selecione um módulo de relatório para visualizar dados detalhados.
          </p>
        </div>
        <Button
          onClick={handleSendEmailReport}
          disabled={sendingEmail}
          className="w-full md:w-auto"
        >
          {sendingEmail ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Mail className="mr-2 h-4 w-4" />
              Enviar Relatório Agora
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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

      <AlertDialog
        open={showNewRoutePrompt}
        onOpenChange={setShowNewRoutePrompt}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Iniciar Nova Rota?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os Funcionários que estão com o Caixa Fechado para a Rota, é
              necessário abrir outra Rota!!! Deseja abrir outra Rota agora?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>NÃO</AlertDialogCancel>
            <AlertDialogAction onClick={handleStartNewRoute}>
              SIM
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default RelatorioDashboard
