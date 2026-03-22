import { supabase } from '@/lib/supabase/client'
import { differenceInDays } from 'date-fns'

export interface LoginNotificationData {
  pendencias: {
    id: number
    cliente_nome: string
    descricao: string
    dias: number
  }[]
  debitos: {
    cliente_id: number
    cliente_nome: string
    debito: number
  }[]
}

export const notificationService = {
  async getLoginNotifications(
    employeeId: number,
    diasPendencia: number,
  ): Promise<LoginNotificationData> {
    try {
      // 1. Fetch Pendencias
      const { data: pendencias } = await supabase
        .from('PENDENCIAS')
        .select(
          `
          id, descricao_pendencia, created_at,
          CLIENTES ("NOME CLIENTE")
        `,
        )
        .eq('resolvida', false)
        .eq('responsavel_id', employeeId)

      let pendenciasAlert: any[] = []

      if (pendencias && pendencias.length > 0) {
        const { data: anotacoes } = await supabase
          .from('pendencia_anotacoes')
          .select('pendencia_id, created_at')
          .in(
            'pendencia_id',
            pendencias.map((p) => p.id),
          )

        const today = new Date()

        pendenciasAlert = pendencias
          .map((p) => {
            const pDate = p.created_at ? new Date(p.created_at) : today
            const pAnotacoes = (anotacoes || []).filter(
              (a) => a.pendencia_id === p.id,
            )

            let lastDate = pDate
            pAnotacoes.forEach((a) => {
              const aDate = new Date(a.created_at)
              if (aDate > lastDate) lastDate = aDate
            })

            const diff = differenceInDays(today, lastDate)

            return {
              id: p.id,
              cliente_nome: p.CLIENTES?.['NOME CLIENTE'] || 'N/D',
              descricao: p.descricao_pendencia,
              dias: diff,
            }
          })
          .filter((p) => p.dias >= diasPendencia)
      }

      // 2. Fetch Debits for Active Route Assigned Clients
      let debtsAlert: any[] = []
      const { data: activeRoute } = await supabase
        .from('ROTA')
        .select('id')
        .is('data_fim', null)
        .limit(1)
        .maybeSingle()

      if (activeRoute) {
        const { data: routeItems } = await supabase
          .from('ROTA_ITEMS')
          .select(
            `
            cliente_id,
            CLIENTES ("NOME CLIENTE")
          `,
          )
          .eq('rota_id', activeRoute.id)
          .eq('vendedor_id', employeeId)

        if (routeItems && routeItems.length > 0) {
          const clientIds = routeItems.map((ri) => ri.cliente_id)

          const { data: debts } = await supabase
            .from('debitos_com_total_view' as any)
            .select('cliente_codigo, debito_total')
            .in('cliente_codigo', clientIds)
            .gt('debito_total', 0)

          const clientsWithDebt = (debts || []).map(
            (d: any) => d.cliente_codigo,
          )

          if (clientsWithDebt.length > 0) {
            const { data: actions } = await supabase
              .from('acoes_cobranca')
              .select('cliente_id')
              .eq('funcionario_id', employeeId)
              .in('cliente_id', clientsWithDebt)

            const clientsWithActions = new Set(
              (actions || []).map((a) => a.cliente_id),
            )

            debtsAlert = (debts || [])
              .filter((d: any) => !clientsWithActions.has(d.cliente_codigo))
              .map((d: any) => {
                const ri = routeItems.find(
                  (r) => r.cliente_id === d.cliente_codigo,
                )
                return {
                  cliente_id: d.cliente_codigo,
                  cliente_nome: ri?.CLIENTES?.['NOME CLIENTE'] || 'N/D',
                  debito: d.debito_total,
                }
              })
          }
        }
      }

      return {
        pendencias: pendenciasAlert,
        debitos: debtsAlert,
      }
    } catch (error) {
      console.error('Error fetching login notifications:', error)
      return { pendencias: [], debitos: [] }
    }
  },
}
