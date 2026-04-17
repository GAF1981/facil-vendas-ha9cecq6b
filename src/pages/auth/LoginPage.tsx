import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { authService } from '@/services/authService'
import { configService } from '@/services/configService'
import { useUserStore } from '@/stores/useUserStore'
import { Loader2, Mail, AlertCircle, HelpCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isNetworkError, setIsNetworkError] = useState(false)
  const [showHelpDialog, setShowHelpDialog] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()
  const { setEmployee, setShowLoginNotification } = useUserStore()

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
    },
  })

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true)
    setErrorMsg(null)
    setIsNetworkError(false)

    try {
      const employee = await authService.loginByEmail(data.email)

      if (employee) {
        setEmployee(employee)

        // Determine if notification box should be shown
        try {
          const loginsNeededStr = await configService.getConfig(
            'logins_para_notificacao',
          )
          const loginsNeeded = parseInt(loginsNeededStr || '3', 10)
          const currentCount = employee.login_count || 1

          if (currentCount > 0 && currentCount % loginsNeeded === 0) {
            setShowLoginNotification(true)
          } else {
            setShowLoginNotification(false)
          }
        } catch (err) {
          console.error('Erro ao verificar configuração de notificações', err)
        }

        const from = (location.state as any)?.from?.pathname || '/'

        toast({
          title: 'Login realizado com sucesso',
          description: `Bem-vindo, ${employee.nome_completo.split(' ')[0]}!`,
          className: 'bg-green-50 border-green-200 text-green-900',
        })

        navigate(from, { replace: true })
      } else {
        setErrorMsg('E-mail não encontrado.')
        toast({
          title: 'Acesso negado',
          description: 'O e-mail informado não consta na base de funcionários.',
          variant: 'destructive',
        })
      }
    } catch (error: any) {
      console.error(error)
      let message = error.message || 'Erro de conexão com o servidor.'
      let title = 'Erro no sistema'
      let networkErr = false

      if (
        message.toLowerCase().includes('failed to fetch') ||
        message.toLowerCase().includes('network error')
      ) {
        title = 'Erro de Conexão'
        message =
          'Sua operadora de celular (4G/5G) parece estar bloqueando a comunicação com o sistema.'
        networkErr = true
      }

      setErrorMsg(message)
      setIsNetworkError(networkErr)

      toast({
        title,
        description: networkErr
          ? 'Falha de rede detectada. Veja as instruções na tela.'
          : message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
      <Card className="w-full max-w-md shadow-lg border-t-4 border-t-primary animate-fade-in-up">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold text-primary">
            FACIL VENDAS
          </CardTitle>
          <CardDescription>
            Entre com seu e-mail para acessar o sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {errorMsg && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>
                {isNetworkError ? 'Falha de Rede (4G/5G)' : 'Erro'}
              </AlertTitle>
              <AlertDescription className="flex flex-col gap-3 mt-2">
                <p>{errorMsg}</p>
                {isNetworkError && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full bg-white text-destructive hover:bg-red-50 hover:text-destructive border-red-200"
                    onClick={(e) => {
                      e.preventDefault()
                      setShowHelpDialog(true)
                    }}
                  >
                    <HelpCircle className="w-4 h-4 mr-2" />
                    Ver passo a passo de como resolver
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          className="pl-9"
                          placeholder="nome@exemplo.com"
                          autoComplete="email"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-center flex-col gap-2">
          <p className="text-xs text-muted-foreground text-center">
            Acesso restrito a funcionários autorizados.
          </p>
        </CardFooter>
      </Card>

      <Dialog open={showHelpDialog} onOpenChange={setShowHelpDialog}>
        <DialogContent className="sm:max-w-md w-[95vw] rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">
              Corrigir erro de conexão
            </DialogTitle>
            <DialogDescription>
              Algumas operadoras de celular (4G/5G) estão bloqueando o acesso ao
              sistema. Siga os passos abaixo para contornar esse bloqueio usando
              o aplicativo <strong>gratuito e seguro</strong> da Cloudflare.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-5 p-1 text-sm text-muted-foreground">
              <div className="space-y-2">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <span className="flex shrink-0 items-center justify-center bg-primary text-primary-foreground w-5 h-5 rounded-full text-xs">
                    1
                  </span>
                  Baixe o aplicativo
                </h4>
                <p className="ml-7">
                  Vá até a loja de aplicativos do seu celular (Play Store no
                  Android ou App Store no iPhone) e busque por{' '}
                  <strong>"1.1.1.1"</strong>.
                </p>
                <p className="ml-7">
                  O aplicativo correto se chama{' '}
                  <strong>"1.1.1.1 + WARP: Safer Internet"</strong> da
                  desenvolvedora Cloudflare.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <span className="flex shrink-0 items-center justify-center bg-primary text-primary-foreground w-5 h-5 rounded-full text-xs">
                    2
                  </span>
                  Instale e Abra
                </h4>
                <p className="ml-7">
                  Após instalar, abra o aplicativo e vá aceitando os termos de
                  uso iniciais para avançar.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <span className="flex shrink-0 items-center justify-center bg-primary text-primary-foreground w-5 h-5 rounded-full text-xs">
                    3
                  </span>
                  Ative a Conexão
                </h4>
                <p className="ml-7">
                  Na tela principal do aplicativo, você verá um botão grande no
                  centro. <strong>Toque nele para conectar</strong>.
                </p>
                <p className="ml-7">
                  O botão mudará de cor e deve mostrar a mensagem "Conectado".
                  Seu celular pode pedir permissão para configurar uma VPN,
                  apenas aceite.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <span className="flex shrink-0 items-center justify-center bg-primary text-primary-foreground w-5 h-5 rounded-full text-xs">
                    4
                  </span>
                  Acesse o sistema
                </h4>
                <p className="ml-7">
                  Com o aplicativo conectado e rodando em segundo plano, volte
                  para esta tela de login e tente entrar novamente. O erro
                  desaparecerá!
                </p>
              </div>

              <div className="mt-4 p-3 bg-blue-50 text-blue-800 rounded-md border border-blue-200">
                <p className="font-medium mb-1">💡 Por que isso acontece?</p>
                <p className="text-xs leading-relaxed">
                  Operadoras de celular costumam ter problemas na rota de DNS,
                  falhando ao carregar sistemas na nuvem. O app 1.1.1.1 apenas
                  corrige essa rota, deixando sua internet mais rápida e sem
                  bloqueios, sem consumir pacote de dados adicional.
                </p>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="mt-2">
            <Button onClick={() => setShowHelpDialog(false)} className="w-full">
              Entendi, vou instalar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
