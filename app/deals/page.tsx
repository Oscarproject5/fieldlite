'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Handshake,
  Search,
  Plus,
  DollarSign,
  Calendar,
  Filter,
  TrendingUp,
  Clock,
  Target
} from 'lucide-react'

interface Deal {
  id: string
  title: string
  description: string
  estimated_value: number
  actual_value: number
  stage: string
  probability: number
  expected_close_date: string
  closed_date: string
  contact_id: string
  created_at: string
  updated_at: string
}

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const supabase = createClient()

  useEffect(() => {
    loadDeals()
  }, [])

  const loadDeals = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading deals:', error)
      } else {
        setDeals(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredDeals = deals.filter(deal =>
    deal.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    deal.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStageColor = (stage: string) => {
    switch (stage?.toLowerCase()) {
      case 'new': return 'default'
      case 'qualified': return 'secondary'
      case 'proposal': return 'warning'
      case 'negotiation': return 'info'
      case 'won': return 'success'
      case 'lost': return 'destructive'
      default: return 'default'
    }
  }

  const totalPipelineValue = deals.reduce((sum, deal) => sum + (deal.estimated_value || deal.actual_value || 0), 0)
  const averageDealSize = deals.length > 0 ? totalPipelineValue / deals.length : 0

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Handshake className="h-8 w-8" />
              Deals Pipeline
            </h1>
            <p className="text-muted-foreground mt-2">
              Track and manage your sales opportunities
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Deal
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pipeline</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalPipelineValue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Across {deals.length} deals
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Deal Size</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${averageDealSize.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Per opportunity
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Deals</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{deals.filter(d => !['won', 'lost'].includes(d.stage?.toLowerCase())).length}</div>
              <p className="text-xs text-muted-foreground">
                In progress
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
                  placeholder="Search deals..."
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
          <div className="text-center py-8">Loading deals...</div>
        ) : filteredDeals.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Handshake className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">No deals found</p>
              <Button className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Deal
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredDeals.map((deal) => (
              <Card key={deal.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-lg">{deal.title}</h3>
                        <Badge variant={getStageColor(deal.stage) as any}>
                          {deal.stage}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-6 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          ${(deal.estimated_value || deal.actual_value || 0).toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Target className="h-4 w-4" />
                          {deal.probability || 0}% probability
                        </span>
                        {deal.expected_close_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Close: {new Date(deal.expected_close_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button variant="outline" size="sm">View Details</Button>
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