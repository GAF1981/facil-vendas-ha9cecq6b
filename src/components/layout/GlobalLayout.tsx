import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { AppSidebar } from './AppSidebar'

export default function GlobalLayout() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex flex-col flex-1 h-full overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto relative">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
