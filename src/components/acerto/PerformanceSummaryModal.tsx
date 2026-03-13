import { useEffect, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Loader2,
  Target,
  TrendingUp,
  CheckCircle,
  PieChart,
} from 'lucide-react'
import { useUserStore } from '@/stores/useUserStore'
import { rotaService } from '@/services/rotaService'
import { metasService } from '@/services/metasService'
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isWeekend,
  startOfDay,
  isAfter,
} from 'date-fns'

interface PerformanceSummaryModalProps {
  onClose: () => void
}

export function PerformanceSummaryModal({
  onClose,
}: PerformanceSummaryModalProps) {
  const { employee } = useUserStore()
  const [isOpen, setIsOpen] = useState(true)
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState({
    totalMetas: 0,
    totalAcertos: 0,
    totalCaptacao: 0,
    apuracao: 0,
    atingimento: 0,
  })

  useEffect(() => {
    let mounted = true

    const load = async () => {
      if (!employee) return handleClose()

      try {
        const activeRota = await rotaService.getActiveRota()
        if (!activeRota || !mounted) return handleClose()

        const items = await rotaService.getRotaItems(activeRota.id)
        const isVendedor = items.some((i) => i.vendedor_id === employee.id)

        if (!isVendedor || !mounted) return handleClose()

        const start = startOfMonth(new Date())
        const end = endOfMonth(new Date())
        const days = eachDayOfInterval({ start, end })
        const startStr = format(start, 'yyyy-MM-dd')
        const endStr = format(end, 'yyyy-MM-dd')

        const [exceptions, fixedMeta, periodMetas, acertosData] =
          await Promise.all([
            metasService.getExceptionDays(),
            metasService.getMeta(employee.id),
            metasService.getMetasPeriodos(employee.id),
            metasService.getAcertos(employee.id, startStr, endStr),
          ])

        if (!mounted) return

        const checkIsException = (date: Date) => {
          const dStr = format(date, 'yyyy-MM-dd')
          for (const exc of exceptions) {
            if (dStr >= exc.data_inicio && dStr <= exc.data_fim) {
              if (
                !exc.funcionario_id ||
                exc.funcionario_id.toString() === employee.id.toString()
              ) {
                return true
              }
            }
          }
          return false
        }

        let totalAcertos = 0
        let totalCaptacao = 0
        let totalMetas = 0
        let totalApuracao = 0
        const today = startOfDay(new Date())

        days.forEach((day) => {
          if (!isAfter(day, today)) {
            const dStr = format(day, 'yyyy-MM-dd')
            const isException = checkIsException(day)
            const isWknd = isWeekend(day)
            const isNonWorkingDay = isException || isWknd

            const periodGoal = periodMetas.find(
              (p) => dStr >= p.data_inicio && dStr <= p.data_fim,
            )
            const effectiveMeta = periodGoal
              ? Number(periodGoal.valor_meta)
              : fixedMeta?.meta_diaria || 0

            const metaForDay = isNonWorkingDay ? 0 : effectiveMeta
            const acertos = acertosData?.regular?.get(dStr) || 0
            const captacao = acertosData?.captacao?.get(dStr) || 0

            totalAcertos += acertos
            totalCaptacao += captacao
            totalMetas += metaForDay
            totalApuracao += acertos - metaForDay
          }
        })

        const atingimento =
          totalMetas > 0 ? (totalAcertos / totalMetas) * 100 : 0

        setMetrics({
          totalMetas: Number(totalMetas.toFixed(2)),
          totalAcertos,
          totalCaptacao,
          apuracao: Number(totalApuracao.toFixed(2)),
          atingimento: Number(atingimento.toFixed(2)),
        })
        setLoading(false)
      } catch (error) {
        console.error('Error loading performance summary:', error)
        handleClose()
      }
    }

    load()

    return () => {
      mounted = false
    }
  }, [employee])

  const handleClose = () => {
    setIsOpen(false)
    onClose()
  }

  if (!isOpen) return null

  let message = ''
  let msgColor = ''

  const { atingimento } = metrics
  if (atingimento < 50) {
    message = 'Estamos só começando, vamos juntos conseguir atingir a meta!'
    msgColor = 'text-red-600'
  } else if (atingimento >= 50 && atingimento < 70) {
    message = 'Força, ainda temos muito trabalho até a meta!'
    msgColor = 'text-red-600'
  } else if (atingimento >= 70 && atingimento < 90) {
    message = 'Vamos lá estamos caminhando para a meta!'
    msgColor = 'text-orange-500'
  } else if (atingimento >= 90 && atingimento < 100) {
    message = 'Vamos estamos quase atingindo a Meta!'
    msgColor = 'text-orange-500'
  } else {
    message = 'Parabéns você conseguiu!'
    msgColor = 'text-green-600'
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={() => {}}>
      <AlertDialogContent className="max-w-md animate-fade-in-up">
        {loading ? (
          <>
            <AlertDialogTitle className="sr-only">
              Carregando Resumo de Desempenho
            </AlertDialogTitle>
            <div className="flex flex-col items-center justify-center p-8 space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Carregando resumo de metas...
              </p>
            </div>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl text-center border-b pb-4">
                Resumo de Desempenho
              </AlertDialogTitle>
              <AlertDialogDescription className="text-center pt-2 text-base text-foreground font-medium">
                Olá, {employee?.nome_completo}! Veja seu progresso neste mês:
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="flex flex-col items-center p-3 bg-muted/30 rounded-lg border">
                <Target className="w-5 h-5 text-indigo-500 mb-1" />
                <span className="text-xs text-muted-foreground font-medium uppercase text-center">
                  Total Metas
                </span>
                <span className="text-2xl font-bold">{metrics.totalMetas}</span>
              </div>
              <div className="flex flex-col items-center justify-center p-3 bg-muted/30 rounded-lg border relative">
                <CheckCircle className="w-5 h-5 text-blue-500 mb-1" />
                <span className="text-xs text-muted-foreground font-medium uppercase text-center">
                  Total Acertos
                </span>
                <span className="text-2xl font-bold">
                  {metrics.totalAcertos}
                </span>
                {metrics.totalCaptacao > 0 && (
                  <div className="absolute bottom-1 left-0 right-0 flex justify-center">
                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-sm">
                      Captação: {metrics.totalCaptacao}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-col items-center p-3 bg-muted/30 rounded-lg border">
                <TrendingUp className="w-5 h-5 text-purple-500 mb-1" />
                <span className="text-xs text-muted-foreground font-medium uppercase text-center">
                  Apuração
                </span>
                <span
                  className={`text-2xl font-bold ${
                    metrics.apuracao < 0 ? 'text-red-600' : 'text-green-600'
                  }`}
                >
                  {metrics.apuracao > 0 ? '+' : ''}
                  {metrics.apuracao}
                </span>
              </div>
              <div className="flex flex-col items-center p-3 bg-muted/30 rounded-lg border">
                <PieChart className="w-5 h-5 text-emerald-500 mb-1" />
                <span className="text-xs text-muted-foreground font-medium uppercase text-center">
                  Atingimento
                </span>
                <span
                  className={`text-2xl font-bold ${
                    metrics.atingimento < 100
                      ? 'text-red-600'
                      : 'text-green-600'
                  }`}
                >
                  {metrics.atingimento}%
                </span>
              </div>
            </div>

            <div
              className={`text-center font-bold text-lg p-3 bg-muted/20 rounded-md border ${msgColor}`}
            >
              "{message}"
            </div>

            <AlertDialogFooter className="sm:justify-center mt-2">
              <AlertDialogAction
                onClick={handleClose}
                className="w-full sm:w-auto px-8"
              >
                Ok
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
}
