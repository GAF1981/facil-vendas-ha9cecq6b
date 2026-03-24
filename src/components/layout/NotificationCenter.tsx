import { useEffect, useState, useCallback } from 'react'
import { ClipboardList, QrCode } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useUserStore } from '@/stores/useUserStore'
import { cn } from '@/lib/utils'
import { Link } from 'react-router-dom'

export function NotificationCenter() {
  const { employee } = useUserStore()
  const [hasPendencia, setHasPendencia] = useState(false)

  const checkNotifications = useCallback(
    async (isMounted: () => boolean) => {
      if (!employee?.id) return

      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()
        if (sessionError || !session) return
      } catch (e) {
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
        console.warn(
          'Silent failure checking pendencia notifications:',
          error?.message || error,
        )
      }
    },
    [employee?.id],
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
        icon={ClipboardList}
        label="pendências"
        alert={hasPendencia}
        to="/pendencias"
      />
      <IconWrapper icon={QrCode} label="pix" alert={false} to="/pix" />
    </div>
  )
}
