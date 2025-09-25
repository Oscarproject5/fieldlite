'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
  Download,
  Filter,
  PieChart,
  LineChart,
  Activity
} from 'lucide-react'

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    revenue: 0,
    customers: 0,
    deals: 0,
    invoices: 0
  })

  const supabase = createClient()

  useEffect(() => {
    loadReportData()
  }, [])

  const loadReportData = async () => {
    setLoading(true)
    try {
      const [contactsResult, dealsResult, invoicesResult] = await Promise.all([
        supabase.from('contacts').select('id', { count: 'exact' }),
        supabase.from('deals').select('estimated_value, actual_value'),
        supabase.from('invoices').select('total_amount, amount_paid, status')
      ])

      const revenue = invoicesResult.data
        ?.filter(i => i.status === 'paid')
        .reduce((sum, i) => sum + (i.amount_paid || i.total_amount || 0), 0) || 0

      const totalDealsValue = dealsResult.data
        ?.reduce((sum, d) => sum + (d.estimated_value || d.actual_value || 0), 0) || 0

      setStats({
        revenue,
        customers: contactsResult.count || 0,
        deals: totalDealsValue,
        invoices: invoicesResult.data?.length || 0
      })
    } catch (error) {
      console.error('Error loading report data:', error)
    } finally {
      setLoading(false)
    }
  }

  const reports = [
    {
      title: 'Sales Performance',
      description: 'Track deals, conversion rates, and sales trends',
      icon: TrendingUp,
      type: 'sales',
      status: 'available'
    },
    {
      title: 'Revenue Analysis',
      description: 'Monitor revenue, payments, and financial metrics',
      icon: DollarSign,
      type: 'revenue',
      status: 'available'
    },
    {
      title: 'Customer Insights',
      description: 'Analyze customer behavior and engagement',
      icon: Users,
      type: 'customers',
      status: 'available'
    },
    {
      title: 'Job Performance',
      description: 'Track job completion rates and efficiency',
      icon: Activity,
      type: 'jobs',
      status: 'available'
    },
    {
      title: 'Product Analytics',
      description: 'Inventory levels and product performance',
      icon: PieChart,
      type: 'products',
      status: 'coming-soon'
    },
    {
      title: 'Custom Reports',
      description: 'Create custom reports with selected metrics',
      icon: LineChart,
      type: 'custom',
      status: 'coming-soon'
    }
  ]

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <BarChart3 className="h-8 w-8" />
              Reports & Analytics
            </h1>
            <p className="text-muted-foreground mt-2">
              Gain insights into your business performance
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Calendar className="mr-2 h-4 w-4" />
              Date Range
            </Button>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.revenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                From paid invoices
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.deals.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Active deals
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.customers}</div>
              <p className="text-xs text-muted-foreground">
                Active contacts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.invoices}</div>
              <p className="text-xs text-muted-foreground">
                All time
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reports.map((report) => {
            const Icon = report.icon
            return (
              <Card key={report.type} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <Icon className="h-8 w-8 text-primary" />
                    {report.status === 'coming-soon' && (
                      <Badge variant="secondary">Coming Soon</Badge>
                    )}
                  </div>
                  <CardTitle className="mt-4">{report.title}</CardTitle>
                  <CardDescription>{report.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      disabled={report.status === 'coming-soon'}
                    >
                      View Report
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={report.status === 'coming-soon'}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {!loading && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Quick Insights</CardTitle>
              <CardDescription>
                Key metrics and trends from your CRM data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Average Deal Size</span>
                  <span className="text-sm text-muted-foreground">
                    ${stats.deals > 0 ? Math.round(stats.deals / Math.max(1, stats.invoices)).toLocaleString() : 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Revenue per Customer</span>
                  <span className="text-sm text-muted-foreground">
                    ${stats.customers > 0 ? Math.round(stats.revenue / stats.customers).toLocaleString() : 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Invoice Collection Rate</span>
                  <span className="text-sm text-muted-foreground">
                    {stats.invoices > 0 ? Math.round((stats.revenue / stats.deals) * 100) : 0}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}