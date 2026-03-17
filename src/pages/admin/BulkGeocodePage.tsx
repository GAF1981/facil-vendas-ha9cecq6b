import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { clientsService } from '@/services/clientsService'
import { ClientRow } from '@/types/client'
import { Loader2, MapPin, Play, CheckCircle2, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function BulkGeocodePage() {
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [clients, setClients] = useState<ClientRow[]>([])
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<{ success: number; error: number }>({
    success: 0,
    error: 0,
  })
  const { toast } = useToast()

  useEffect(() => {
    loadPendingClients()
  }, [])

  const loadPendingClients = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('CLIENTES')
        .select('*')
        .eq('situacao', 'ATIVO')
        .or('latitude.is.null,longitude.is.null,latitude.eq.0,longitude.eq.0')
        .limit(500)

      if (error) throw error
      setClients(data as ClientRow[])
    } catch (error) {
      console.error(error)
      toast({ title: 'Erro ao carregar', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const startGeocoding = async () => {
    setProcessing(true)
    setProgress(0)
    setStatus({ success: 0, error: 0 })

    let successes = 0
    let errors = 0

    for (let i = 0; i < clients.length; i++) {
      const client = clients[i]
      const fullAddress = `${client.ENDEREÇO || ''}, ${client.BAIRRO ? client.BAIRRO + ', ' : ''}${client.MUNICÍPIO || ''}`

      if (fullAddress.trim().length > 5) {
        try {
          const coords = await clientsService.geocodeAddress(fullAddress)
          if (coords && coords.lat && coords.lon) {
            await supabase
              .from('CLIENTES')
              .update({
                latitude: coords.lat,
                longitude: coords.lon,
              })
              .eq('CODIGO', client.CODIGO)
            successes++
          } else {
            errors++
          }
        } catch (e) {
          errors++
        }
      } else {
        errors++
      }

      setProgress(Math.round(((i + 1) / clients.length) * 100))
      setStatus({ success: successes, error: errors })

      // Sleep to respect Nominatim limits (1 req/sec)
      await new Promise((r) => setTimeout(r, 1000))
    }

    setProcessing(false)
    toast({
      title: 'Processo concluído',
      description: `${successes} atualizados, ${errors} falhas.`,
    })
    loadPendingClients()
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto pb-20">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link to="/clientes">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Geocodificação em Massa
          </h1>
          <p className="text-muted-foreground">
            Identifique e atualize as coordenadas de clientes ativos que ainda
            não possuem latitude e longitude.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Status da Base de Clientes
          </CardTitle>
          <CardDescription>
            Esta ferramenta processa até 500 clientes por vez para evitar
            bloqueios no serviço de mapas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-muted/30 p-4 rounded-lg border flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-left">
                  <h4 className="font-semibold text-lg">
                    {clients.length} Clientes Pendentes
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Clientes ativos sem coordenadas registradas.
                  </p>
                </div>
                <Button
                  onClick={startGeocoding}
                  disabled={processing || clients.length === 0}
                  size="lg"
                >
                  {processing ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Play className="mr-2 h-5 w-5" />
                  )}
                  Iniciar Processamento
                </Button>
              </div>

              {processing && (
                <div className="space-y-4 bg-card p-6 rounded-lg border shadow-sm">
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span>Processando...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <div className="flex gap-6 justify-center pt-2">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="font-medium">
                        {status.success} Atualizados
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      <span className="font-medium">{status.error} Falhas</span>
                    </div>
                  </div>
                </div>
              )}

              {!processing && clients.length === 0 && !loading && (
                <div className="text-center p-8 border border-dashed rounded-lg bg-green-50/50 text-green-800">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <p className="font-medium">
                    Parabéns! Todos os clientes ativos possuem coordenadas.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
