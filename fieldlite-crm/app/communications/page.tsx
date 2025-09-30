'use client'

import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Loader2 } from 'lucide-react'

// Dynamically import the Communication Hub to optimize initial load
const CommunicationHub = dynamic(
  () => import('@/components/communications/hub/CommunicationHub').then(mod => mod.CommunicationHub),
  {
    loading: () => (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading Communication Hub...</p>
        </div>
      </div>
    ),
    ssr: false // Disable SSR for better performance with real-time features
  }
)

export default function CommunicationsPage() {

  return (
    <DashboardLayout>
      <Suspense fallback={
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }>
        <CommunicationHub />
      </Suspense>
    </DashboardLayout>
  )
}