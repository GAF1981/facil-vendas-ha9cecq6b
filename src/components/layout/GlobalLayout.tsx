import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { AppSidebar } from './AppSidebar'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { LoginNotificationBox } from '@/components/auth/LoginNotificationBox'

export default function GlobalLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="h-screen overflow-hidden">
        <Header />
        <div className="flex-1 overflow-auto relative">
          <Outlet />
        </div>
        <LoginNotificationBox />
      </SidebarInset>
    </SidebarProvider>
  )
}
