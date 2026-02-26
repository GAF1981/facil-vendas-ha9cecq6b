import { useEffect, useState, useMemo } from 'react'
import { ClipboardList, FileText, QrCode, Wallet, Banknote } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useUserStore } from '@/stores/useUserStore'
import { cn } from '@/lib/utils'
import { Link } from 'react-router-dom'

export function NotificationCenter() {
  const { employee } = useUserStore()
  const [hasPendencia, setHasPendencia] = useState(false)
  const [hasNotaFiscal, setHasNotaFiscal] = useState(false)
  const [hasPix, setHasPix] = useState(false)
  const [hasCaixaAberto, setHasCaixaAberto] = useState(false)
  const [hasRecolhido, setHasRecolhido] = useState(false)

  const isFinanceiroOuAdmin = useMemo(() => {
    if (!employee?.setor) return false
    const sectors = Array.isArray(employee.setor)
      ? employee.setor
      : [employee.setor]
    return sectors.some(
      (s) =>
        typeof s === 'string' &&
        ['financeiro', 'administrador', 'gerente'].includes(s.toLowerCase()),
    )
  }, [employee])

  useEffect(() => {
    // Session validation: only proceed if employee and valid ID are present
    if (!employee || !employee.id) return

    const checkNotifications = async () => {
      try {
        // Pendência Alert - Robust error handling for intermittent network failures
        try {
          const { data: pendenciaData, error: pendenciaError } = await supabase
            .from('PENDENCIAS')
            .select('id')
            .eq('resolvida', false)
            .eq('responsavel_id', employee.id)
            .limit(1)

          if (pendenciaError) {
            console.warn(
              'Supabase error checking pendencias:',
              pendenciaError.message || pendenciaError,
            )
          } else {
            setHasPendencia((pendenciaData?.length || 0) > 0)
          }
        } catch (error: any) {
          console.error(
            'Network or fetch error checking pendencia notifications. Failed to fetch from PENDENCIAS table:',
            error?.message || error,
          )
          // Catch the error and continue execution to prevent app crashes
        }

        // Caixa Alert - globally checks all open routes for the logged-in user
        try {
          const { data: caixaData, error: caixaError } = await supabase
            .from('fechamento_caixa')
            .select('id')
            .in('status', ['ABERTO', 'Aberto']) // Case-sensitive exact match for ABERTO (and legacy Aberto)
            .eq('funcionario_id', employee.id)
            .limit(1)

          if (!caixaError) {
            setHasCaixaAberto((caixaData?.length || 0) > 0)
          } else {
            console.warn(
              'Supabase error checking caixa:',
              caixaError.message || caixaError,
            )
          }
        } catch (error: any) {
          console.error(
            'Network or fetch error checking caixa notifications:',
            error?.message || error,
          )
        }

        if (isFinanceiroOuAdmin) {
          // Nota Fiscal Alert
          try {
            const { data: nfData1, error: nfError1 } = await supabase
              .from('BANCO_DE_DADOS')
              .select('"NÚMERO DO PEDIDO"')
              .not('"NÚMERO DO PEDIDO"', 'is', null)
              .or(
                'nota_fiscal_cadastro.eq.SIM,nota_fiscal_venda.eq.SIM,solicitacao_nf.eq.SIM',
              )
              .or('nota_fiscal_emitida.neq.Emitida,nota_fiscal_emitida.is.null')
              .limit(1)

            if (!nfError1) {
              setHasNotaFiscal((nfData1?.length || 0) > 0)
            } else {
              console.warn(
                'Supabase error checking nota fiscal notifications:',
                nfError1.message || nfError1,
              )
            }
          } catch (error: any) {
            console.error(
              'Network or fetch error checking nota fiscal notifications:',
              error?.message || error,
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
            } else {
              console.warn(
                'Supabase error checking pix notifications:',
                pixError1?.message || pixError2?.message,
              )
            }
          } catch (error: any) {
            console.error(
              'Network or fetch error checking pix notifications:',
              error?.message || error,
            )
          }

          // Recolhido Alert
          try {
            const { data: recData, error: recError } = await supabase
              .from('fechamento_caixa')
              .select('id')
              .in('status', ['Fechado', 'FECHADO'])
              .is('recolhido_por_id', null)
              .limit(1)

            if (!recError) {
              setHasRecolhido((recData?.length || 0) > 0)
            } else {
              console.warn(
                'Supabase error checking recolhido notifications:',
                recError.message || recError,
              )
            }
          } catch (error: any) {
            console.error(
              'Network or fetch error checking recolhido notifications:',
              error?.message || error,
            )
          }
        }
      } catch (e: any) {
        console.error(
          'Unexpected error in checkNotifications:',
          e?.message || e,
        )
      }
    }

    checkNotifications()

    // Refresh notifications every 30 seconds
    const interval = setInterval(checkNotifications, 30000)
    return () => clearInterval(interval)
  }, [employee, isFinanceiroOuAdmin])

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
        icon={Wallet}
        label="caixa"
        alert={hasCaixaAberto}
        to="/caixa"
      />
      <IconWrapper
        icon={ClipboardList}
        label="pendências"
        alert={hasPendencia}
        to="/pendencias"
      />
      {isFinanceiroOuAdmin && (
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
          <IconWrapper
            icon={Banknote}
            label="recolhido"
            alert={hasRecolhido}
            to="/fechamentos"
          />
        </>
      )}
    </div>
  )
}
