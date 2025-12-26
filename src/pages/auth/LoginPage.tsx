import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoginFormData, loginSchema } from '@/types/employee'
import { authService } from '@/services/authService'
import { useAuth } from '@/hooks/use-auth'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Lock, Mail } from 'lucide-react'
import { useUserStore } from '@/stores/useUserStore'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { setEmployee } = useUserStore()

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true)
    try {
      // 1. Verify credentials against FUNCIONARIOS table first (Business Rule)
      const employee = await authService.verifyCredentials(
        data.email,
        data.password,
      )

      if (!employee) {
        throw new Error('Email ou senha incorretos.')
      }

      // 2. If valid in FUNCIONARIOS, attempt Supabase Auth (Session Management)
      const { error: signInError } = await signIn(data.email, data.password)

      if (signInError) {
        // If login fails, check if it's because user doesn't exist (Invalid login credentials)
        if (
          signInError.message.includes('Invalid login credentials') ||
          signInError.message.includes('not found')
        ) {
          console.log(
            'User verified in DB but not in Auth. Attempting auto-signup...',
          )
          const { error: signUpError } = await signUp(data.email, data.password)

          if (signUpError) {
            console.error('Auto-signup failed:', signUpError)
            throw new Error(
              'Erro ao estabelecer sessão segura. Contate o suporte.',
            )
          }

          // Let's try sign in again to be sure
          const { error: retryError } = await signIn(data.email, data.password)
          if (retryError) {
            throw retryError
          }
        } else {
          throw signInError
        }
      }

      // 3. Success - Store employee data and redirect
      setEmployee(employee)

      toast({
        title: 'Bem-vindo(a)',
        description: `Login realizado com sucesso. Olá, ${employee.nome_completo}!`,
      })
      navigate('/dashboard')
    } catch (error: any) {
      console.error(error)
      let message = error.message || 'Ocorreu um erro ao tentar entrar.'

      if (message.includes('Password should be at least')) {
        message =
          'Erro de configuração: A senha no sistema Auth precisa ser maior (min 6). Contate o admin.'
      }

      toast({
        title: 'Erro de acesso',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-lg border-t-4 border-t-primary">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-2">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-primary">
            FACIL VENDAS
          </CardTitle>
          <CardDescription>
            Entre com suas credenciais de funcionário
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Usuário (Email)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="seu@email.com"
                          className="pl-9"
                          {...field}
                          autoComplete="email"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="password"
                          placeholder="••••"
                          maxLength={4}
                          className="pl-9 tracking-widest"
                          {...field}
                          onChange={(e) => {
                            // Ensure only numbers
                            const value = e.target.value.replace(/\D/g, '')
                            field.onChange(value)
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-11 text-base"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Autenticando...
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col items-center justify-center text-xs text-muted-foreground gap-1">
          <p>Acesso restrito a funcionários autorizados.</p>
          <p>© 2025 Facil Vendas v1.0</p>
        </CardFooter>
      </Card>
    </div>
  )
}
