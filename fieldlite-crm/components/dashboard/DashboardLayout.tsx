'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from '@/components/theme-toggle'
import {
  Home,
  Users,
  FileText,
  Calendar,
  DollarSign,
  Settings,
  Menu,
  X,
  LogOut,
  Briefcase,
  MessageSquare,
  BarChart3,
  Package,
  Phone,
  Activity,
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Communications', href: '/communications', icon: Activity },
  { name: 'Deals', href: '/deals', icon: Briefcase },
  { name: 'Estimates', href: '/estimates', icon: FileText },
  { name: 'Jobs', href: '/jobs', icon: Calendar },
  { name: 'Invoices', href: '/invoices', icon: DollarSign },
  { name: 'Products', href: '/products', icon: Package },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Mobile sidebar */}
      <div className={`md:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 flex z-40">
          <div className="fixed inset-0" onClick={() => setSidebarOpen(false)}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
          </div>
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-card clay-card">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-6 w-6 text-white" />
              </button>
            </div>
            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              <div className="flex-shrink-0 flex items-center justify-between px-4">
                <h1 className="text-xl font-bold text-primary">FieldLite CRM</h1>
                <ThemeToggle />
              </div>
              <nav className="mt-5 px-2 space-y-1">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`${
                      pathname === item.href
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    } group flex items-center px-2 py-2 text-base font-medium rounded-xl transition-all duration-200 clay-button`}
                  >
                    <item.icon
                      className={`${
                        pathname === item.href ? 'text-primary' : 'text-muted-foreground'
                      } mr-4 flex-shrink-0 h-6 w-6`}
                    />
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="flex-shrink-0 flex border-t border-border p-4">
              <button
                onClick={handleSignOut}
                className="flex items-center text-muted-foreground hover:text-foreground clay-button p-2 rounded-lg"
              >
                <LogOut className="h-5 w-5 mr-2" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Static sidebar for desktop */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col h-0 flex-1 border-r border-border bg-card clay-card">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center justify-between flex-shrink-0 px-4">
                <h1 className="text-xl font-bold text-primary">FieldLite CRM</h1>
                <ThemeToggle />
              </div>
              <nav className="mt-5 flex-1 px-2 space-y-1">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`${
                      pathname === item.href
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    } group flex items-center px-2 py-2 text-sm font-medium rounded-xl transition-all duration-200 clay-button`}
                  >
                    <item.icon
                      className={`${
                        pathname === item.href ? 'text-primary' : 'text-muted-foreground'
                      } mr-3 flex-shrink-0 h-6 w-6`}
                    />
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="flex-shrink-0 flex border-t border-border p-4">
              <button
                onClick={handleSignOut}
                className="flex items-center text-muted-foreground hover:text-foreground w-full clay-button p-2 rounded-lg transition-all duration-200"
              >
                <LogOut className="h-5 w-5 mr-2" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        <div className="md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3">
          <button
            className="h-12 w-12 inline-flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary clay-button"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
        <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  )
}