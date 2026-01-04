import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { EmployeeFormData, employeeSchema, Employee } from '@/types/employee'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Image as ImageIcon, Camera } from 'lucide-react'
import { maskCPF } from '@/lib/masks'
import { employeesService } from '@/services/employeesService'
import { permissionsService } from '@/services/permissionsService'
import { useToast } from '@/hooks/use-toast'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { CameraCapture } from '@/components/common/CameraCapture'
import { MultiSelect } from '@/components/common/MultiSelect'

interface EmployeeFormProps {
  initialData?: Employee
  onSuccess?: () => void
  onCancel?: () => void
}

export function EmployeeForm({
  initialData,
  onSuccess,
  onCancel,
}: EmployeeFormProps) {
  const [loading, setLoading] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const [sectors, setSectors] = useState<string[]>([])
  const { toast } = useToast()

  // Handle legacy sector (string) vs new sector (string[])
  const defaultSector = initialData
    ? Array.isArray(initialData.setor)
      ? initialData.setor
      : initialData.setor
        ? [initialData.setor] // Convert legacy string to array
        : []
    : []

  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: initialData
      ? {
          nome_completo: initialData.nome_completo,
          apelido: initialData.apelido || '',
          cpf: initialData.cpf || '',
          email: initialData.email,
          setor: defaultSector,
          senha: initialData.senha || '',
          foto_url: initialData.foto_url || '',
          situacao: initialData.situacao || 'ATIVO',
        }
      : {
          nome_completo: '',
          apelido: '',
          cpf: '',
          email: '',
          setor: [],
          senha: '',
          foto_url: '',
          situacao: 'ATIVO',
        },
  })

  useEffect(() => {
    // Fetch sectors for dropdown
    const loadSectors = async () => {
      try {
        const sectorList = await permissionsService.getSectors()
        const defaults = [
          'Vendedor',
          'Estoque',
          'Motoqueiro',
          'Financeiro',
          'Administrador',
          'Gerente', // Added per requirement
          'Outros',
        ]
        const merged = Array.from(new Set([...defaults, ...sectorList])).sort()
        setSectors(merged)
      } catch (error) {
        console.error('Failed to load sectors', error)
        setSectors([
          'Vendedor',
          'Estoque',
          'Motoqueiro',
          'Financeiro',
          'Administrador',
          'Gerente',
          'Outros',
        ])
      }
    }
    loadSectors()
  }, [])

  const watchPhotoUrl = form.watch('foto_url')

  const handleCameraCapture = (dataUrl: string) => {
    form.setValue('foto_url', dataUrl, { shouldDirty: true })
  }

  const onSubmit = async (data: EmployeeFormData) => {
    setLoading(true)
    try {
      if (!data.senha && !initialData) {
        data.senha = '0000'
      } else if (!data.senha && initialData) {
        data.senha = initialData.senha || '0000'
      }

      if (initialData) {
        await employeesService.update(initialData.id, data)
        toast({
          title: 'Funcionário atualizado',
          description: 'Os dados foram salvos com sucesso.',
          className: 'bg-green-50 border-green-200 text-green-900',
        })
      } else {
        await employeesService.create(data)
        // Ensure permissions are initialized for these sectors
        if (data.setor && data.setor.length > 0) {
          for (const s of data.setor) {
            await permissionsService.initPermissionsForSetor(s)
          }
        }
        toast({
          title: 'Funcionário cadastrado',
          description: 'Novo funcionário adicionado com sucesso.',
          className: 'bg-green-50 border-green-200 text-green-900',
        })
      }
      onSuccess?.()
    } catch (error: any) {
      console.error(error)
      toast({
        title: 'Erro ao salvar',
        description: error.message || 'Ocorreu um erro ao salvar os dados.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const sectorOptions = sectors.map((s) => ({ label: s, value: s }))

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="h-32 w-32 border-2 border-muted shadow-sm">
                <AvatarImage
                  src={watchPhotoUrl || undefined}
                  className="object-cover"
                />
                <AvatarFallback className="text-4xl bg-muted">
                  <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
                </AvatarFallback>
              </Avatar>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowCamera(true)}
                className="gap-2"
              >
                <Camera className="h-4 w-4" />
                Tirar Foto
              </Button>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nome_completo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome completo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="apelido"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Apelido</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Apelido"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="situacao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Situação *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a situação" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ATIVO">ATIVO</SelectItem>
                        <SelectItem value="INATIVO">INATIVO</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cpf"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="000.000.000-00"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) =>
                          field.onChange(maskCPF(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="email@empresa.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="setor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Setor(es)</FormLabel>
                    <FormControl>
                      <MultiSelect
                        options={sectorOptions}
                        selected={field.value || []}
                        onChange={field.onChange}
                        placeholder="Selecione os setores"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="senha"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha (Opcional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Deixe em branco para manter"
                        maxLength={20}
                        {...field}
                        value={field.value || ''}
                        type="password"
                        autoComplete="new-password"
                      />
                    </FormControl>
                    <FormDescription>Para login no sistema.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="foto_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL da Foto</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://..."
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            )}
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {initialData ? 'Salvar Alterações' : 'Cadastrar Funcionário'}
            </Button>
          </div>
        </form>
      </Form>

      <CameraCapture
        open={showCamera}
        onOpenChange={setShowCamera}
        onCapture={handleCameraCapture}
      />
    </>
  )
}
