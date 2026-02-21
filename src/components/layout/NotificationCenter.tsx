import { useEffect, useState } from 'react'
import { ClipboardList, FileText, QrCode } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useUserStore } from '@/stores/useUserStore'
import { cn } from '@/lib/utils'
import { Link } from 'react-router-dom'

export function NotificationCenter() {
  const { employee } = useUserStore()
  const [hasPendencia, setHasPendencia] = useState(false)
  const [hasNotaFiscal, setHasNotaFiscal] = useState(false)
  const [hasPix, setHasPix] = useState(false)

  useEffect(() => {
    // Session validation: only proceed if employee and valid ID are present
    if (!employee || !employee.id) return

    const checkNotifications = async () => {
      // Pendência Alert
      try {
        const { data: pendenciaData, error: pendenciaError } = await supabase
          .from('PENDENCIAS')
          .select('id')
          .eq('resolvida', false)
          .eq('responsavel_id', employee.id)
          .limit(1)

        if (!pendenciaError) {
          setHasPendencia((pendenciaData?.length || 0) > 0)
        }
      } catch (error) {
        // Silently fail on network/fetch errors
        console.warn(
          'Network or fetch error checking pendencia notifications:',
          error,
        )
      }

      const isFinanceiro = employee.setor?.some(
        (s) => typeof s === 'string' && s.toLowerCase() === 'financeiro',
      )

      if (isFinanceiro) {
        // Nota Fiscal Alert - strictly exact 'Pendente' and NOT NULL order
        try {
          const { data: nfData1, error: nfError1 } = await supabase
            .from('BANCO_DE_DADOS')
            .select('"NÚMERO DO PEDIDO"')
            .not('"NÚMERO DO PEDIDO"', 'is', null)
            .neq('nota_fiscal_emitida', 'Emitida')
            .or(
              'nota_fiscal_emitida.eq.Pendente,nota_fiscal_cadastro.eq.SIM,nota_fiscal_venda.eq.SIM,solicitacao_nf.eq.SIM',
            )
            .limit(1)

          if (!nfError1) {
            setHasNotaFiscal((nfData1?.length || 0) > 0)
          }
        } catch (error) {
          console.warn(
            'Network or fetch error checking nota fiscal notifications:',
            error,
          )
        }

        // Pix Alert
        try {
          const { data: pixData1, error: pixError1 } = await supabase
            .from('fechamento_caixa')
            .select('id')
            .gt('valor_pix', 0)
            .is('pix_aprovado', null)
            .limit(1)

          const { data: pixData2, error: pixError2 } = await supabase
            .from('fechamento_caixa')
            .select('id')
            .gt('valor_pix', 0)
            .eq('pix_aprovado', false)
            .limit(1)

          if (!pixError1 && !pixError2) {
            setHasPix(
              (pixData1?.length || 0) > 0 || (pixData2?.length || 0) > 0,
            )
          }
        } catch (error) {
          console.warn(
            'Network or fetch error checking pix notifications:',
            error,
          )
        }
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
    to,
  }: {
    icon: any
    label: string
    alert: boolean
    to: string
  }) => (
    <Link
      to={to}
      className="flex flex-col items-center justify-center gap-0.5 w-11 sm:w-14 hover:bg-muted/50 rounded p-1 transition-colors"
    >
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
    </Link>
  )

  return (
    <div className="flex items-center gap-1 sm:gap-3 mr-2 sm:mr-4 border-r pr-2 sm:pr-4">
      <IconWrapper
        icon={ClipboardList}
        label="pendências"
        alert={hasPendencia}
        to="/pendencias"
      />
      {employee?.setor?.some(
        (s) => typeof s === 'string' && s.toLowerCase() === 'financeiro',
      ) && (
        <>
          <IconWrapper
            icon={FileText}
            label="nota fiscal"
            alert={hasNotaFiscal}
            to="/nota-fiscal"
          />
          <IconWrapper
            icon={QrCode}
            label="pix"
            alert={hasPix}
            to="/fechamentos"
          />
        </>
      )}
    </div>
  )
}
