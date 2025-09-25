import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import DashboardStats from '@/components/dashboard/DashboardStats'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  return (
    <DashboardLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">Welcome back to FieldLite CRM</p>
        </div>

        <DashboardStats />

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Leads</h2>
            <p className="text-gray-600">No leads yet. Start by adding your first lead.</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Jobs</h2>
            <p className="text-gray-600">No scheduled jobs. Create your first job to get started.</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}