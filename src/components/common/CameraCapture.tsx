import { useRef, useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Camera, RefreshCw, Check } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface CameraCaptureProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCapture: (dataUrl: string) => void
}

export function CameraCapture({
  open,
  onOpenChange,
  onCapture,
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 300, height: 300 },
        audio: false,
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
      setError(null)
    } catch (err) {
      console.error('Error accessing camera:', err)
      setError('Não foi possível acessar a câmera. Verifique as permissões.')
      toast({
        title: 'Erro na Câmera',
        description:
          'Permissão negada ou dispositivo não encontrado. Use HTTPS.',
        variant: 'destructive',
      })
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
  }

  useEffect(() => {
    if (open) {
      startCamera()
      setCapturedImage(null)
    } else {
      stopCamera()
    }
    return () => stopCamera()
  }, [open])

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d')
      if (context) {
        // Draw video frame to canvas
        const width = videoRef.current.videoWidth
        const height = videoRef.current.videoHeight
        canvasRef.current.width = width
        canvasRef.current.height = height
        context.drawImage(videoRef.current, 0, 0, width, height)

        // Convert to Data URL
        const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.8)
        setCapturedImage(dataUrl)
      }
    }
  }

  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage)
      onOpenChange(false)
    }
  }

  const handleRetake = () => {
    setCapturedImage(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Tirar Foto
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center min-h-[300px] bg-black rounded-md overflow-hidden relative">
          {error ? (
            <div className="text-white text-center p-4">{error}</div>
          ) : !capturedImage ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform scale-x-[-1]" // Mirror effect
            />
          ) : (
            <img
              src={capturedImage}
              alt="Captured"
              className="w-full h-full object-cover transform scale-x-[-1]"
            />
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <DialogFooter className="flex gap-2 sm:justify-center">
          {!capturedImage ? (
            <Button onClick={handleCapture} className="w-full bg-blue-600">
              <Camera className="mr-2 h-4 w-4" /> Capturar
            </Button>
          ) : (
            <div className="flex gap-2 w-full">
              <Button
                variant="outline"
                onClick={handleRetake}
                className="flex-1"
              >
                <RefreshCw className="mr-2 h-4 w-4" /> Tentar Novamente
              </Button>
              <Button onClick={handleConfirm} className="flex-1 bg-green-600">
                <Check className="mr-2 h-4 w-4" /> Confirmar
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
