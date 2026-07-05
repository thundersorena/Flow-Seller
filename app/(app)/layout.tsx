import { Sidebar } from '@/components/app/sidebar'
import { SessionSync } from '@/components/app/session-sync'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <SessionSync />
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
