'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Calculator,
  Search,
  Plus,
  DollarSign,
  Calendar,
  Filter,
  FileText,
  Send,
  Clock
} from 'lucide-react'

interface Estimate {
  id: string
  estimate_number: string
  contact_id: string
  total: number
  status: string
  valid_until: string
  created_at: string
  updated_at: string
}

export default function EstimatesPage() {
  const [estimates, setEstimates] = useState<Estimate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const supabase = createClient()

  useEffect(() => {
    loadEstimates()
  }, [])

  const loadEstimates = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('estimates')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading estimates:', error)
      } else {
        setEstimates(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredEstimates = estimates.filter(estimate =>
    estimate.estimate_number?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'draft': return 'default'
      case 'sent': return 'secondary'
      case 'approved': return 'success'
      case 'rejected': return 'destructive'
      case 'expired': return 'warning'
      default: return 'default'
    }
  }

  const totalEstimateValue = estimates.reduce((sum, estimate) => sum + (estimate.total || 0), 0)
  const approvedCount = estimates.filter(e => e.status?.toLowerCase() === 'approved').length

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Calculator className="h-8 w-8" />
              Estimates
            </h1>
            <p className="text-muted-foreground mt-2">
              Create and manage cost estimates for your clients
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Estimate
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalEstimateValue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Across {estimates.length} estimates
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{approvedCount}</div>
              <p className="text-xs text-muted-foreground">
                Estimates approved
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{estimates.filter(e => e.status?.toLowerCase() === 'sent').length}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting response
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search estimates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-8">Loading estimates...</div>
        ) : filteredEstimates.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Calculator className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">No estimates found</p>
              <Button className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Estimate
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredEstimates.map((estimate) => (
              <Card key={estimate.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-lg">#{estimate.estimate_number}</h3>
                        <Badge variant={getStatusColor(estimate.status) as any}>
                          {estimate.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-6 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          ${(estimate.total || 0).toLocaleString()}
                        </span>
                        {estimate.valid_until && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Valid until: {new Date(estimate.valid_until).toLocaleDateString()}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {new Date(estimate.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {estimate.status === 'draft' && (
                        <Button variant="outline" size="sm">
                          <Send className="mr-2 h-4 w-4" />
                          Send
                        </Button>
                      )}
                      <Button variant="outline" size="sm">View</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}