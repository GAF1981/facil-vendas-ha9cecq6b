import { useEffect, useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

interface BarcodeScannerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onScan: (code: string) => void
}

export function BarcodeScannerDialog({
  open,
  onOpenChange,
  onScan,
}: BarcodeScannerDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [supported, setSupported] = useState(true)

  useEffect(() => {
    if (!open) {
      stopCamera()
      return
    }

    // Check support for BarcodeDetector API
    if (!('BarcodeDetector' in window)) {
      setSupported(false)
      return
    }

    startCamera()

    return () => {
      stopCamera()
    }
  }, [open])

  const startCamera = async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
        setScanning(true)
        detectBarcode()
      }
    } catch (err: any) {
      console.error(err)
      setError('Não foi possível acessar a câmera. Verifique as permissões.')
      setScanning(false)
    }
  }

  const stopCamera = () => {
    setScanning(false)
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach((track) => track.stop())
      videoRef.current.srcObject = null
    }
  }

  const detectBarcode = async () => {
    if (!videoRef.current || !scanning) return

    try {
      // @ts-expect-error - BarcodeDetector is experimental and might not be in TS definitions
      const barcodeDetector = new (window as any).BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'qr_code'],
      })

      const barcodes = await barcodeDetector.detect(videoRef.current)
      if (barcodes.length > 0) {
        const code = barcodes[0].rawValue
        onScan(code)
        onOpenChange(false)
        return // Stop loop
      }
    } catch (err) {
      // Detection error, ignore and retry
    }

    if (open) {
      requestAnimationFrame(detectBarcode)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Escanear Código de Barras</DialogTitle>
          <DialogDescription>
            Aponte a câmera para o código de barras do produto.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center min-h-[300px] bg-black rounded-md overflow-hidden relative">
          {!supported ? (
            <div className="text-white text-center p-6">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
              <p className="mb-4">
                Seu navegador não suporta a detecção de código de barras nativa.
              </p>
              <Button
                onClick={() => {
                  onScan('7891234567890')
                  onOpenChange(false)
                }}
              >
                Simular Leitura (Teste)
              </Button>
            </div>
          ) : error ? (
            <div className="text-white text-center p-6">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
              <p>{error}</p>
              <Button
                variant="secondary"
                onClick={startCamera}
                className="mt-4"
              >
                Tentar Novamente
              </Button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
              <div className="absolute inset-0 border-2 border-white/50 m-12 rounded-lg pointer-events-none">
                <div className="absolute inset-0 border-2 border-primary/80 m-1 rounded-sm animate-pulse"></div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
