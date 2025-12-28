import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ClientSearch } from '@/components/acerto/ClientSearch'
import { ClientDetails } from '@/components/acerto/ClientDetails'
import { AcertoHistoryTable } from '@/components/acerto/AcertoHistoryTable'
import { ClientRow } from '@/types/client'
import { bancoDeDadosService } from '@/services/bancoDeDadosService'
import { ArrowDownCircle } from 'lucide-react'

export default function RecebimentoPage() {
  const [client, setClient] = useState<ClientRow | null>(null)
  const [monthlyAverage, setMonthlyAverage] = useState(0)
  const [lastAcerto, setLastAcerto] = useState<{
    date: string
    time: string
  } | null>(null)
  const [loadingLastAcerto, setLoadingLastAcerto] = useState(false)

  // Fetch data when client changes
  useEffect(() => {
    if (client) {
      // 1. Fetch Monthly Average
      bancoDeDadosService
        .getMonthlyAverage(client.CODIGO)
        .then((avg) => setMonthlyAverage(avg))
        .catch((err) => console.error('Error fetching monthly average', err))

      // 2. Fetch Last Acerto for ClientDetails
      setLoadingLastAcerto(true)
      bancoDeDadosService
        .getLastAcerto(client.CODIGO)
        .then((data) => setLastAcerto(data))
        .catch((err) => console.error('Error fetching last acerto', err))
        .finally(() => setLoadingLastAcerto(false))
    } else {
      setMonthlyAverage(0)
      setLastAcerto(null)
    }
  }, [client])

  const handleClientSelect = (selected: ClientRow) => {
    setClient(selected)
  }

  return (
    <div className="space-y-6 animate-fade-in p-2 pb-10 sm:p-6">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-emerald-100 text-emerald-700 rounded-lg shrink-0">
          <ArrowDownCircle className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recebimentos</h1>
          <p className="text-muted-foreground">
            Consulte o histórico financeiro e acertos dos clientes.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Buscar Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <ClientSearch onSelect={handleClientSelect} />
          </CardContent>
        </Card>

        {client && (
          <div className="space-y-6 animate-fade-in-up">
            <ClientDetails
              client={client}
              lastAcerto={lastAcerto}
              loading={loadingLastAcerto}
            />

            <div className="pt-2">
              <AcertoHistoryTable
                clientId={client.CODIGO}
                monthlyAverage={monthlyAverage}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
