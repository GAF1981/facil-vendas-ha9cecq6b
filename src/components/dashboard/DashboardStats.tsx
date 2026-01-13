import { useEffect, useState } from 'react'
import { MetricCard } from '@/components/dashboard/MetricCard'
import {
  DollarSign,
  TrendingUp,
  Map as MapIcon,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { dashboardService } from '@/services/dashboardService'
import { DashboardMetrics } from '@/types/dashboard'
import { formatCurrency } from '@/lib/formatters'

export function DashboardStats() {
  // The user story requested the removal of specific metric cards to declutter the interface.
  // "The metric cards for 'Vendas Hoje', 'Recebimentos Hoje', 'Débito Total', and 'Rotas Ativas' must be removed"
  // Since these were the only cards in this component, we return null to remove the section.
  return null
}
