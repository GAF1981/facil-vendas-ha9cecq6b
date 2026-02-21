import { useEffect, useState } from 'react'
import { ClipboardList, FileText, QrCode } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useUserStore } from '@/stores/useUserStore'
import { cn } from '@/lib/utils'

export function NotificationCenter() {
  const { employee } = useUserStore()
  const [hasPendencia, setHasPendencia] = useState(false)
  const [hasNotaFiscal, setHasNotaFiscal] = useState(false)
  const [hasPix, setHasPix] = useState(false)

  useEffect(() => {
    if (!employee) return

    const checkNotifications = async () => {
      // Pendência Alert
      const { count: pendenciaCount } = await supabase
        .from('PENDENCIAS')
        .select('id', { count: 'exact', head: true })
        .eq('resolvida', false)
        .eq('responsavel_id', employee.id)

      setHasPendencia((pendenciaCount || 0) > 0)

      const isFinanceiro = employee.setor?.some(
        (s) => s.toLowerCase() === 'financeiro',
      )

      if (isFinanceiro) {
        // Nota Fiscal Alert
        const { count: nfCount1 } = await supabase
          .from('BANCO_DE_DADOS')
          .select('"NÚMERO DO PEDIDO"', { count: 'exact', head: true })
          .eq('nota_fiscal_emitida', 'Pendente')

        const { count: nfCount2 } = await supabase
          .from('BANCO_DE_DADOS')
          .select('"NÚMERO DO PEDIDO"', { count: 'exact', head: true })
          .eq('solicitacao_nf', 'SIM')
          .neq('nota_fiscal_emitida', 'Emitida')

        setHasNotaFiscal((nfCount1 || 0) > 0 || (nfCount2 || 0) > 0)

        // Pix Alert
        const { count: pixCount1 } = await supabase
          .from('fechamento_caixa')
          .select('id', { count: 'exact', head: true })
          .gt('valor_pix', 0)
          .is('pix_aprovado', null)

        const { count: pixCount2 } = await supabase
          .from('fechamento_caixa')
          .select('id', { count: 'exact', head: true })
          .gt('valor_pix', 0)
          .eq('pix_aprovado', false)

        setHasPix((pixCount1 || 0) > 0 || (pixCount2 || 0) > 0)
      }
    }

    checkNotifications()

    // Refresh notifications every 30 seconds
    const interval = setInterval(checkNotifications, 30000)
    return () => clearInterval(interval)
  }, [employee])

  const IconWrapper = ({
    icon: Icon,
    label,
    alert,
  }: {
    icon: any
    label: string
    alert: boolean
  }) => (
    <div className="flex flex-col items-center justify-center gap-0.5 w-11 sm:w-14">
      <Icon
        className={cn(
          'h-4 w-4 sm:h-5 sm:w-5 transition-colors',
          alert ? 'text-destructive animate-pulse' : 'text-muted-foreground',
        )}
      />
      <span
        className={cn(
          'text-[9px] sm:text-[10px] leading-none whitespace-nowrap',
          alert ? 'text-destructive font-medium' : 'text-muted-foreground',
        )}
      >
        {label}
      </span>
    </div>
  )

  return (
    <div className="flex items-center gap-1 sm:gap-3 mr-2 sm:mr-4 border-r pr-2 sm:pr-4">
      <IconWrapper
        icon={ClipboardList}
        label="pendencia"
        alert={hasPendencia}
      />
      {employee?.setor?.some((s) => s.toLowerCase() === 'financeiro') && (
        <>
          <IconWrapper
            icon={FileText}
            label="nota fiscal"
            alert={hasNotaFiscal}
          />
          <IconWrapper icon={QrCode} label="Pix" alert={hasPix} />
        </>
      )}
    </div>
  )
}
