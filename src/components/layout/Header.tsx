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
import {
  Bell,
  Settings,
  LogOut,
  UserCircle,
  ArrowLeft,
  Home,
} from 'lucide-react'
import { useLocation, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { useUserStore } from '@/stores/useUserStore'

export function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const pathnames = location.pathname.split('/').filter((x) => x)
  const { signOut } = useAuth()
  const { employee, clearEmployee } = useUserStore()

  const handleSignOut = async () => {
    await signOut()
    clearEmployee()
    navigate('/login')
  }

  const handleSwitchUser = async () => {
    await signOut()
    clearEmployee()
    navigate('/login')
  }

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
      default:
        return path
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4 sticky top-0 z-10 shadow-sm">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />

        <div className="flex items-center gap-2 mr-2">
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
        <Button variant="ghost" size="icon" className="text-muted-foreground">
          <Bell className="h-5 w-5" />
          <span className="sr-only">Notificações</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-10 w-10 rounded-full focus-visible:ring-1 focus-visible:ring-offset-1"
            >
              <Avatar className="h-10 w-10 border border-border">
                <AvatarImage
                  src={employee?.foto_url || undefined}
                  alt={employee?.nome_completo || 'User'}
                  className="object-cover"
                />
                <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                  {employee?.nome_completo
                    ? getInitials(employee.nome_completo)
                    : 'Foto'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64" align="end" forceMount>
            <DropdownMenuLabel className="font-normal p-3">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none truncate">
                  {employee?.nome_completo || 'Usuário'}
                </p>
                <p className="text-xs leading-none text-muted-foreground truncate">
                  {employee?.email || 'email@exemplo.com'}
                </p>
                {employee?.setor && (
                  <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 w-fit mt-1">
                    {employee.setor}
                  </span>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              <span>Configurações</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive cursor-pointer"
              onClick={handleSwitchUser}
            >
              <UserCircle className="mr-2 h-4 w-4" />
              <span>Fazer login com outro usuário</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive cursor-pointer"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair do app</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
