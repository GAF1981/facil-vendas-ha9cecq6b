import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Mail,
  CalendarClock,
  ShieldCheck,
  Loader2,
  Send,
  Settings,
  Save,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { emailSeguroService } from '@/services/emailSeguroService'

export default function EmailSeguroPage() {
  const [loading, setLoading] = useState(false)
  const [savingConfig, setSavingConfig] = useState(false)
  const [recipientEmail, setRecipientEmail] = useState('')
  const [originalEmail, setOriginalEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const { toast } = useToast()

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      const email = await emailSeguroService.getRecipientEmail()
      if (email) {
        setRecipientEmail(email)
        setOriginalEmail(email)
      }
    } catch (error) {
      console.error('Failed to load email config', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar a configuração de e-mail.',
        variant: 'destructive',
      })
    }
  }

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(email)
  }

  const handleSaveConfig = async () => {
    setEmailError('')

    if (!recipientEmail) {
      setEmailError('O e-mail é obrigatório.')
      return
    }

    if (!validateEmail(recipientEmail)) {
      setEmailError('Por favor, insira um e-mail válido.')
      return
    }

    setSavingConfig(true)
    try {
      await emailSeguroService.updateRecipientEmail(recipientEmail)
      setOriginalEmail(recipientEmail)
      toast({
        title: 'Sucesso',
        description: 'E-mail atualizado com sucesso!',
        className: 'bg-green-600 text-white',
      })
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar o e-mail. Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSavingConfig(false)
    }
  }

  const handleSendReport = async () => {
    setLoading(true)
    try {
      await emailSeguroService.sendReport()
      toast({
        title: 'Sucesso',
        description: 'Relatório enviado com sucesso!',
        className: 'bg-green-600 text-white',
      })
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Falha ao enviar o relatório. Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in p-4 sm:p-6">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-blue-100 text-blue-700 rounded-lg">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">E-mail Seguro</h1>
          <p className="text-muted-foreground">
            Automação e envio seguro de relatórios de rota.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Email Configuration Card */}
        <Card className="md:col-span-2 border-indigo-200 bg-indigo-50/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-indigo-800">
              <Settings className="w-5 h-5" />
              Configuração de Destinatário
            </CardTitle>
            <CardDescription>
              Defina o e-mail que receberá os relatórios automáticos e manuais.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
              <div className="grid w-full gap-2">
                <Label htmlFor="email">E-mail do Destinatário</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="exemplo@empresa.com"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className={emailError ? 'border-red-500' : ''}
                />
                {emailError && (
                  <p className="text-xs text-red-500 font-medium">
                    {emailError}
                  </p>
                )}
              </div>
              <Button
                onClick={handleSaveConfig}
                disabled={
                  savingConfig ||
                  (recipientEmail === originalEmail && !emailError)
                }
                className="w-full sm:w-auto min-w-[120px]"
              >
                {savingConfig ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Salvar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-orange-600" />
              Agendamento Automático
            </CardTitle>
            <CardDescription>Configuração do envio diário.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="bg-muted/50 p-4 rounded-md border">
                <p className="text-sm font-medium">
                  Status: <span className="text-green-600">Ativo</span>
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  O relatório "Controle de Rota" é gerado e enviado
                  automaticamente todos os dias às <strong>07:00 AM</strong>.
                </p>
              </div>
              <div className="text-xs text-muted-foreground">
                Destinatário atual:{' '}
                <strong>{originalEmail || 'Carregando...'}</strong>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-1 border-blue-200 bg-blue-50/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Mail className="w-5 h-5" />
              Envio Manual
            </CardTitle>
            <CardDescription>
              Precisa do relatório agora? Dispare o envio imediatamente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              size="lg"
              onClick={handleSendReport}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-5 w-5" />
                  Enviar Relatório Agora
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground mt-4 text-center">
              O arquivo CSV será enviado para:{' '}
              <strong>{originalEmail || '...'}</strong>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
