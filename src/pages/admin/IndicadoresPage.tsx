import { useEffect, useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Activity, ArrowLeft, Loader2, Save } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useToast } from '@/hooks/use-toast'
import { configService } from '@/services/configService'

export default function IndicadoresPage() {
  const [diasSemAcao, setDiasSemAcao] = useState('10')
  const [diasPendencia, setDiasPendencia] = useState('5')
  const [loginsNotificacao, setLoginsNotificacao] = useState('3')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const loadConfig = async () => {
      setLoading(true)
      try {
        const valAcao = await configService.getConfig('dias_sem_acao_cobranca')
        if (valAcao !== null) setDiasSemAcao(valAcao)

        const valPend = await configService.getConfig(
          'dias_notificacao_pendencia',
        )
        if (valPend !== null) setDiasPendencia(valPend)

        const valLogins = await configService.getConfig(
          'logins_para_notificacao',
        )
        if (valLogins !== null) setLoginsNotificacao(valLogins)
      } catch (error) {
        toast({
          title: 'Erro',
          description: 'Falha ao carregar configurações de indicadores.',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    loadConfig()
  }, [toast])

  const handleSave = async () => {
    if (
      !diasSemAcao ||
      isNaN(Number(diasSemAcao)) ||
      !diasPendencia ||
      isNaN(Number(diasPendencia)) ||
      !loginsNotificacao ||
      isNaN(Number(loginsNotificacao))
    ) {
      toast({
        title: 'Valor Inválido',
        description: 'Por favor, insira números válidos nos campos.',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      await configService.setConfig('dias_sem_acao_cobranca', diasSemAcao)
      await configService.setConfig('dias_notificacao_pendencia', diasPendencia)
      await configService.setConfig(
        'logins_para_notificacao',
        loginsNotificacao,
      )

      toast({
        title: 'Sucesso',
        description: 'Configurações de indicadores salvas com sucesso.',
        className: 'bg-green-600 text-white',
      })
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao salvar as configurações.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in p-4 sm:p-6 pb-20 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 text-blue-700 rounded-lg shrink-0">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Indicadores</h1>
            <p className="text-muted-foreground">
              Configurações de alertas e métricas do sistema.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Alertas de Cobrança</CardTitle>
            <CardDescription>
              Defina o período limite para alertar sobre inatividade nas
              cobranças.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center p-4">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="dias">Dias sem ação de Cobrança</Label>
                  <Input
                    id="dias"
                    type="number"
                    min="1"
                    value={diasSemAcao}
                    onChange={(e) => setDiasSemAcao(e.target.value)}
                    placeholder="Ex: 10"
                  />
                  <p className="text-xs text-muted-foreground">
                    Clientes que ultrapassarem este limite de dias sem ações
                    registradas serão alertados.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Caixa de Notificações</CardTitle>
            <CardDescription>
              Regras para exibição da caixa de notificações ao fazer login.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center p-4">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="diasPendencia">
                    Dias sem resolução (Pendências)
                  </Label>
                  <Input
                    id="diasPendencia"
                    type="number"
                    min="1"
                    value={diasPendencia}
                    onChange={(e) => setDiasPendencia(e.target.value)}
                    placeholder="Ex: 5"
                  />
                  <p className="text-xs text-muted-foreground">
                    Pendências sem atualização ou resolução que ultrapassarem
                    este limite serão notificadas.
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t">
                  <Label htmlFor="logins">
                    Frequência de Notificação (Logins)
                  </Label>
                  <Input
                    id="logins"
                    type="number"
                    min="1"
                    value={loginsNotificacao}
                    onChange={(e) => setLoginsNotificacao(e.target.value)}
                    placeholder="Ex: 3"
                  />
                  <p className="text-xs text-muted-foreground">
                    Exibir a caixa a cada X logins realizados pelo funcionário.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving || loading}
          className="w-full sm:w-auto min-w-[200px]"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Salvar Configurações
        </Button>
      </div>
    </div>
  )
}
