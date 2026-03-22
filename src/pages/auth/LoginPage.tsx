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
import { useToast } from '@/hooks/use-toast'
import { authService } from '@/services/authService'
import { configService } from '@/services/configService'
import { useUserStore } from '@/stores/useUserStore'
import { Loader2, Mail, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
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
      const message = error.message || 'Erro de conexão com o servidor.'
      setErrorMsg(message)
      toast({
        title: 'Erro no sistema',
        description: message,
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
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>{errorMsg}</AlertDescription>
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
    </div>
  )
}
