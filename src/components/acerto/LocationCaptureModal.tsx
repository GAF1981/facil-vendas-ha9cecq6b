import { useState, useRef, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { clientsService } from '@/services/clientsService'
import { MapPin, Loader2, Navigation, Map, AlertTriangle } from 'lucide-react'
import { ClientRow } from '@/types/client'

interface LocationCaptureModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  client: ClientRow
  onSuccess: (lat: number, lon: number) => void
  onForceSignature: () => void
}

export function LocationCaptureModal({
  open,
  onOpenChange,
  client,
  onSuccess,
  onForceSignature,
}: LocationCaptureModalProps) {
  const [loadingGps, setLoadingGps] = useState(false)
  const [loadingAddress, setLoadingAddress] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmForceOpen, setConfirmForceOpen] = useState(false)

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

  useEffect(() => {
    if (open) {
      setLatitude('')
      setLongitude('')
    }
  }, [open])

  const handleCaptureGps = () => {
    setLoadingGps(true)

    try {
      if (!navigator.geolocation) {
        toast({
          title: 'Erro',
          description: 'Geolocalização não é suportada pelo seu navegador.',
          variant: 'destructive',
        })
        if (mounted.current) setLoadingGps(false)
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (mounted.current) {
            setLatitude(position.coords.latitude.toString())
            setLongitude(position.coords.longitude.toString())
            setLoadingGps(false)
          }
        },
        (error) => {
          console.error('Geolocation error:', error.code, error.message)
          if (!mounted.current) return

          let description =
            'Não foi possível obter sua localização atual via GPS. Verifique as permissões do dispositivo.'

          if (
            error.code === 1 ||
            error.message?.toLowerCase().includes('permissions policy')
          ) {
            description =
              'Acesso à localização bloqueado pelo navegador. Por favor, verifique as permissões do site ou utilize a busca por endereço.'
          }

          toast({
            title: 'Erro de Localização',
            description,
            variant: 'destructive',
          })
          setLoadingGps(false)
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      )
    } catch (err: any) {
      console.error('Synchronous Geolocation error:', err)
      if (mounted.current) {
        toast({
          title: 'Erro de Localização',
          description:
            'Acesso à localização bloqueado pelo navegador (Permissions Policy). Utilize a busca por endereço.',
          variant: 'destructive',
        })
        setLoadingGps(false)
      }
    }
  }

  const handleCaptureAddress = async () => {
    setLoadingAddress(true)
    try {
      const addressString = `${client.ENDEREÇO || ''}, ${client.MUNICÍPIO || ''}, ${client['CEP OFICIO'] || ''}`
      const coords = await clientsService.geocodeAddress(addressString)

      if (!mounted.current) return

      if (coords && coords.lat != null && coords.lon != null) {
        setLatitude(coords.lat.toString())
        setLongitude(coords.lon.toString())
      } else {
        toast({
          title: 'Não encontrado',
          description:
            'Não foi possível encontrar as coordenadas para o endereço cadastrado.',
          variant: 'destructive',
        })
      }
    } catch (error: any) {
      if (!mounted.current) return
      toast({
        title: 'Erro',
        description:
          error.message || 'Falha ao buscar localização por endereço.',
        variant: 'destructive',
      })
    } finally {
      if (mounted.current) setLoadingAddress(false)
    }
  }

  const handleSave = async () => {
    if (!latitude || !longitude) return

    setSaving(true)
    const lat = parseFloat(latitude)
    const lon = parseFloat(longitude)

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
        error?.message || 'Falha ao salvar as coordenadas no banco de dados.'
      toast({
        title: 'Erro',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      if (mounted.current) {
        setSaving(false)
      }
    }
  }

  const handleConfirmForce = () => {
    setConfirmForceOpen(false)
    onForceSignature()
  }

  const isOkDisabled =
    !latitude || !longitude || saving || loadingGps || loadingAddress

  return (
    <>
      <Dialog open={open} onOpenChange={(val) => !saving && onOpenChange(val)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <MapPin className="h-5 w-5" />
              Localização Necessária
            </DialogTitle>
            <DialogDescription className="text-base font-medium text-foreground py-2">
              Esse cliente não tem as coordenadas de sua localização inseridas
              no cadastro de clientes, é necessário inserir as coordenadas para
              prosseguir!!!
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-muted/30 p-3 rounded-md border space-y-1 text-sm">
              <p>
                <strong className="text-muted-foreground">Endereço:</strong>{' '}
                {client.ENDEREÇO || '-'}
              </p>
              <p>
                <strong className="text-muted-foreground">Município:</strong>{' '}
                {client.MUNICÍPIO || '-'}
              </p>
              <p>
                <strong className="text-muted-foreground">CEP:</strong>{' '}
                {client['CEP OFICIO'] || '-'}
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCaptureGps}
                disabled={loadingGps || saving}
                className="w-full justify-start"
              >
                {loadingGps ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Navigation className="mr-2 h-4 w-4 text-blue-600" />
                )}
                Utilizar Localização Atual
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleCaptureAddress}
                disabled={loadingAddress || saving}
                className="w-full justify-start"
              >
                {loadingAddress ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Map className="mr-2 h-4 w-4 text-green-600" />
                )}
                Buscar Localização pelo Endereço
              </Button>

              <Button
                type="button"
                onClick={() => setConfirmForceOpen(true)}
                disabled={saving}
                className="w-full justify-start bg-red-600 hover:bg-red-700 text-white"
              >
                <AlertTriangle className="mr-2 h-4 w-4" />
                Forçar Assinatura
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="latitude" className="text-xs">
                  Latitude
                </Label>
                <Input
                  id="latitude"
                  value={latitude}
                  readOnly
                  placeholder="Aguardando..."
                  className="bg-muted font-mono text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="longitude" className="text-xs">
                  Longitude
                </Label>
                <Input
                  id="longitude"
                  value={longitude}
                  readOnly
                  placeholder="Aguardando..."
                  className="bg-muted font-mono text-sm"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              onClick={handleSave}
              disabled={isOkDisabled}
              className="w-full sm:w-auto min-w-[120px]"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'OK'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmForceOpen} onOpenChange={setConfirmForceOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Atenção</AlertDialogTitle>
            <AlertDialogDescription className="text-base text-foreground">
              Será forçada a finalização sem registro das coordenadas do
              cliente, deseja prosseguir?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmForce}
              className="bg-red-600 hover:bg-red-700"
            >
              Sim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
