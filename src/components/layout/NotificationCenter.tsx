import { useEffect, useState, useMemo, useCallback } from 'react'
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

  const checkNotifications = useCallback(
    async (isMounted: () => boolean) => {
      if (!employee?.id) return

      // State Validation: Ensure user is authenticated before attempting fetches
      // This prevents unauthorized request attempts that might trigger fetch failures
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()
        if (sessionError || !session) return
      } catch (e) {
        // Fail silently on session check error
        return
      }

      if (!isMounted()) return

      // Pendência Alert
      try {
        const { data: pendenciaData, error: pendenciaError } = await supabase
          .from('PENDENCIAS')
          .select('id')
          .eq('resolvida', false)
          .eq('responsavel_id', employee.id)
          .limit(1)

        if (!pendenciaError && isMounted()) {
          setHasPendencia((pendenciaData?.length || 0) > 0)
        }
      } catch (error: any) {
        // Graceful Failure: Use warn instead of error to avoid dev overlays and fail silently
        console.warn(
          'Silent failure checking pendencia notifications:',
          error?.message || error,
        )
      }

      if (!isMounted()) return

      // Caixa Alert
      try {
        const { data: caixaData, error: caixaError } = await supabase
          .from('fechamento_caixa')
          .select('id')
          .in('status', ['ABERTO', 'Aberto'])
          .eq('funcionario_id', employee.id)
          .limit(1)

        if (!caixaError && isMounted()) {
          setHasCaixaAberto((caixaData?.length || 0) > 0)
        }
      } catch (error: any) {
        console.warn(
          'Silent failure checking caixa notifications:',
          error?.message || error,
        )
      }

      if (!isMounted() || !isFinanceiroOuAdmin) return

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

        if (!nfError1 && isMounted()) {
          setHasNotaFiscal((nfData1?.length || 0) > 0)
        }
      } catch (error: any) {
        console.warn(
          'Silent failure checking nota fiscal notifications:',
          error?.message || error,
        )
      }

      if (!isMounted()) return

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

        if (!pixError1 && !pixError2 && isMounted()) {
          setHasPix((pixData1?.length || 0) > 0 || (pixData2?.length || 0) > 0)
        }
      } catch (error: any) {
        console.warn(
          'Silent failure checking pix notifications:',
          error?.message || error,
        )
      }

      if (!isMounted()) return

      // Recolhido Alert
      try {
        const { data: recData, error: recError } = await supabase
          .from('fechamento_caixa')
          .select('id')
          .in('status', ['Fechado', 'FECHADO'])
          .is('recolhido_por_id', null)
          .limit(1)

        if (!recError && isMounted()) {
          setHasRecolhido((recData?.length || 0) > 0)
        }
      } catch (error: any) {
        console.warn(
          'Silent failure checking recolhido notifications:',
          error?.message || error,
        )
      }
    },
    [employee?.id, isFinanceiroOuAdmin],
  )

  useEffect(() => {
    let isMounted = true
    const getIsMounted = () => isMounted

    const runChecks = async () => {
      if (isMounted) await checkNotifications(getIsMounted)
    }

    runChecks()

    const interval = setInterval(runChecks, 30000)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [checkNotifications])

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
