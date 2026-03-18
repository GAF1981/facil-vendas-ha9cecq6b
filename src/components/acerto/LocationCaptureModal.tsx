import { useState, useRef, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { clientsService } from '@/services/clientsService'
import { MapPin, Loader2 } from 'lucide-react'
import { ClientRow } from '@/types/client'

interface LocationCaptureModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  client: ClientRow
  onSuccess: (lat: number, lon: number) => void
}

export function LocationCaptureModal({
  open,
  onOpenChange,
  client,
  onSuccess,
}: LocationCaptureModalProps) {
  const [loading, setLoading] = useState(false)
  const [latitude, setLatitude] = useState<string>('')
  const [longitude, setLongitude] = useState<string>('')
  const { toast } = useToast()
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const handleCapture = () => {
    setLoading(true)
    if (!navigator.geolocation) {
      toast({
        title: 'Erro',
        description: 'Geolocalização não é suportada pelo seu navegador.',
        variant: 'destructive',
      })
      if (mounted.current) setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude
        const lon = position.coords.longitude

        if (mounted.current) {
          setLatitude(lat.toString())
          setLongitude(lon.toString())
        }

        try {
          await clientsService.update(client.CODIGO, {
            latitude: lat,
            longitude: lon,
          })

          if (!mounted.current) return

          toast({
            title: 'Coordenadas Gravadas com Sucesso!!!',
            className: 'bg-green-600 text-white',
          })

          onSuccess(lat, lon)
        } catch (error: any) {
          console.error('Location update error:', error)
          if (!mounted.current) return
          const msg =
            error?.message ||
            'Falha ao salvar as coordenadas no banco de dados.'
          toast({
            title: 'Erro',
            description: msg,
            variant: 'destructive',
          })
        } finally {
          if (mounted.current) {
            setLoading(false)
          }
        }
      },
      (error) => {
        console.error('Geolocation error:', error.code, error.message)
        if (!mounted.current) return
        toast({
          title: 'Erro de Localização',
          description:
            'Não foi possível obter sua localização. Verifique as permissões do navegador.',
          variant: 'destructive',
        })
        setLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    )
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !loading && onOpenChange(val)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <MapPin className="h-5 w-5" />
            Localização Necessária
          </DialogTitle>
          <DialogDescription className="text-base font-medium text-foreground py-2">
            Esse cliente não tem as coordenadas de sua localização inseridas no
            cadastro de clientes, é necessário inserir as coordenadas para
            prosseguir!!!
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="latitude" className="text-right">
              Latitude
            </Label>
            <Input
              id="latitude"
              value={latitude}
              readOnly
              placeholder="Aguardando..."
              className="col-span-3 bg-muted"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="longitude" className="text-right">
              Longitude
            </Label>
            <Input
              id="longitude"
              value={longitude}
              readOnly
              placeholder="Aguardando..."
              className="col-span-3 bg-muted"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleCapture}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Obtendo localização...
              </>
            ) : (
              'OK'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
