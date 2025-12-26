import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Bell, ArrowLeft, Home, User, LogOut } from 'lucide-react'
import { useLocation, Link, useNavigate } from 'react-router-dom'
import { useUserStore } from '@/stores/useUserStore'
import { cn } from '@/lib/utils'

export function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const pathnames = location.pathname.split('/').filter((x) => x)
  const { employee, clearEmployee } = useUserStore()

  const getBreadcrumbName = (path: string) => {
    switch (path) {
      case 'dashboard':
        return 'Menu Principal'
      case 'clientes':
        return 'Clientes'
      case 'funcionarios':
        return 'Funcionários'
      case 'novo':
        return 'Novo'
      case 'vendas':
        return 'Vendas'
      case 'acerto':
        return 'Acerto'
      case 'complemento':
        return 'Complemento'
      case 'recebimento':
        return 'Recebimento'
      case 'nota-fiscal':
        return 'Nota Fiscal'
      case 'caixa':
        return 'Caixa'
      case 'cobranca':
        return 'Cobrança'
      case 'inventario':
        return 'Inventário'
      case 'rota':
        return 'Rota'
      case 'relatorio':
        return 'Relatório'
      case 'pendencias':
        return 'Pendências'
      default:
        return path
    }
  }

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ')
    if (parts.length === 0) return ''
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()

    const firstInitial = parts[0][0]
    const lastInitial = parts[parts.length - 1][0]

    return (firstInitial + lastInitial).toUpperCase()
  }

  const handleSignOut = () => {
    clearEmployee()
    navigate('/login')
  }

  const initials = employee?.nome_completo
    ? getInitials(employee.nome_completo)
    : ''
  const hasPhoto = !!employee?.foto_url

  return (
    <header className="flex min-h-16 shrink-0 items-center gap-2 border-b bg-background px-4 sticky top-0 z-10 shadow-sm py-2">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />

        <div className="flex items-center gap-1 mr-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            title="Voltar"
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/dashboard')}
            title="Tela Inicial"
            className="h-8 w-8"
          >
            <Home className="h-4 w-4" />
          </Button>
        </div>

        <Separator
          orientation="vertical"
          className="mr-2 h-4 hidden md:block"
        />

        <Breadcrumb className="hidden md:flex">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">Início</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {pathnames.map((value, index) => {
              const to = `/${pathnames.slice(0, index + 1).join('/')}`
              const isLast = index === pathnames.length - 1
              const name = getBreadcrumbName(value)
              const isId = value.length > 20 || !isNaN(Number(value))
              const displayName = isId ? 'Detalhes' : name

              return (
                <div key={to} className="flex items-center gap-2">
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    {isLast ? (
                      <BreadcrumbPage className="capitalize">
                        {displayName}
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link to={to} className="capitalize">
                          {displayName}
                        </Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </div>
              )
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="ml-auto flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hidden sm:flex"
        >
          <Bell className="h-5 w-5" />
          <span className="sr-only">Notificações</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                'relative h-auto p-1 rounded-full hover:bg-transparent focus-visible:ring-1 focus-visible:ring-offset-1 px-2',
                hasPhoto ? 'flex flex-col gap-1' : '',
              )}
            >
              <div className="flex flex-col items-center gap-1">
                <Avatar className="h-10 w-10 border border-border">
                  <AvatarImage
                    src={employee?.foto_url || undefined}
                    alt={employee?.nome_completo || 'User'}
                    className="object-cover"
                  />
                  <AvatarFallback className="text-[12px] font-bold bg-primary/10 text-primary">
                    {initials || <User className="h-5 w-5" />}
                  </AvatarFallback>
                </Avatar>
                {/* If photo exists, show initials below it as requested */}
                {hasPhoto && initials && (
                  <span className="text-[10px] font-bold leading-none text-muted-foreground uppercase">
                    {initials}
                  </span>
                )}
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64" align="end" forceMount>
            <DropdownMenuLabel className="font-normal p-3">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none truncate">
                  {employee?.nome_completo || 'Usuário'}
                </p>
                <p className="text-xs leading-none text-muted-foreground truncate">
                  {employee?.email || 'user@example.com'}
                </p>
                {employee?.setor && (
                  <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold transition-colors border-transparent bg-secondary text-secondary-foreground w-fit mt-1">
                    {employee.setor}
                  </span>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair do App</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
