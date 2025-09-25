'use client'

import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import {
  Phone,
  User,
  Building2,
  CreditCard,
  Bell,
  Shield,
  Mail,
  ChevronRight,
  Settings2
} from 'lucide-react'

const settingsMenu = [
  {
    title: 'Call Tracking',
    description: 'Configure Twilio for calls and SMS',
    href: '/settings/twilio',
    icon: Phone,
    badge: 'New'
  },
  {
    title: 'Company Profile',
    description: 'Manage your company information',
    href: '/settings/company',
    icon: Building2,
  },
  {
    title: 'User Management',
    description: 'Manage team members and permissions',
    href: '/settings/users',
    icon: User,
  },
  {
    title: 'Billing',
    description: 'Manage subscription and payment methods',
    href: '/settings/billing',
    icon: CreditCard,
  },
  {
    title: 'Notifications',
    description: 'Configure notification preferences',
    href: '/settings/notifications',
    icon: Bell,
  },
  {
    title: 'Email Templates',
    description: 'Customize email templates',
    href: '/settings/email',
    icon: Mail,
  },
  {
    title: 'Security',
    description: 'Security and privacy settings',
    href: '/settings/security',
    icon: Shield,
  },
]

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings2 className="h-8 w-8" />
          Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage your account and application preferences
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {settingsMenu.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <item.icon className="h-5 w-5 text-blue-600" />
                    <span>{item.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.badge && (
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                        {item.badge}
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>
                </CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Quick Setup Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Twilio Integration</span>
              <span className="text-xs text-muted-foreground">Not configured</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Email Templates</span>
              <span className="text-xs text-muted-foreground">Default templates</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Team Members</span>
              <span className="text-xs text-muted-foreground">1 user</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    </DashboardLayout>
  )
}