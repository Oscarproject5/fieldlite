'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ClickToCall } from '@/components/twilio/click-to-call'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  Calendar,
  Loader2,
  RefreshCw,
  User,
  TrendingUp,
  TrendingDown,
  Activity,
  MessageSquare,
  Plus,
  Edit,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertCircle,
  BarChart3,
  PieChart
} from 'lucide-react'
import { formatDistanceToNow, format, startOfWeek, endOfWeek, eachDayOfInterval, subDays } from 'date-fns'

interface Call {
  id: string
  twilio_call_sid: string
  from_number: string
  to_number: string
  direction: 'inbound' | 'outbound'
  status: string
  duration_seconds?: number
  price?: number
  recording_url?: string
  created_at: string
  ended_at?: string
  initiated_by?: string
  contact_id?: string
  contact?: Contact
  notes?: string
  outcome?: string
  tenant_id?: string
}

interface Contact {
  id: string
  first_name: string
  last_name: string
  company?: string
  type: string
}

interface CallSchedule {
  id: string
  contact_id: string
  contact?: Contact
  scheduled_at: string
  title?: string
  notes?: string
  status: string
  completed_at?: string
}

interface CallNote {
  id: string
  call_id: string
  content: string
  created_at: string
  created_by?: string
}

export default function CallsPage() {
  const [calls, setCalls] = useState<Call[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedCall, setSelectedCall] = useState<Call | null>(null)
  const [showCallDetails, setShowCallDetails] = useState(false)
  const [showScheduleDialog, setShowScheduleDialog] = useState(false)
  const [scheduledCalls, setScheduledCalls] = useState<CallSchedule[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedContact, setSelectedContact] = useState<string>('')
  const [callNotes, setCallNotes] = useState<CallNote[]>([])
  const [newNote, setNewNote] = useState('')
  const [callOutcome, setCallOutcome] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [savingOutcome, setSavingOutcome] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDirection, setFilterDirection] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [activeTab, setActiveTab] = useState('recent')
  const [scheduleForm, setScheduleForm] = useState({
    contact_id: '',
    scheduled_at: '',
    scheduled_time: '',
    title: '',
    notes: ''
  })
  const [callAnalytics, setCallAnalytics] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    loadCalls()

    // Set up real-time subscription for new calls
    const subscription = supabase
      .channel('calls_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'calls'
      }, () => {
        // Reload calls when any change happens
        loadCalls()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const loadCalls = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

      if (!profile?.tenant_id) return

      // Load calls with contact information
      const { data: callsData, error } = await supabase
        .from('calls')
        .select(`
          *,
          contact:contacts!contact_id (
            id,
            first_name,
            last_name,
            company,
            type
          )
        `)
        .eq('tenant_id', profile.tenant_id)
        .order('created_at', { ascending: false })
        .limit(100)

      if (!error && callsData) {
        setCalls(callsData)
        calculateAnalytics(callsData)
      }

      // Load scheduled calls
      const { data: schedules } = await supabase
        .from('call_schedules')
        .select(`
          *,
          contact:contacts!contact_id (
            id,
            first_name,
            last_name,
            company
          )
        `)
        .eq('tenant_id', profile.tenant_id)
        .eq('status', 'pending')
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })

      if (schedules) {
        setScheduledCalls(schedules)
      }

      // Load contacts for dropdown
      const { data: contactsData } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, company')
        .order('first_name')

      if (contactsData) {
        setContacts(contactsData)
      }
    } catch (error) {
      console.error('Error loading calls:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const calculateAnalytics = (callsData: Call[]) => {
    const now = new Date()
    const weekAgo = subDays(now, 7)
    const monthAgo = subDays(now, 30)

    const weekCalls = callsData.filter(c => new Date(c.created_at) >= weekAgo)
    const monthCalls = callsData.filter(c => new Date(c.created_at) >= monthAgo)

    const analytics = {
      daily: {} as Record<string, number>,
      weekly: {
        total: weekCalls.length,
        inbound: weekCalls.filter(c => c.direction === 'inbound').length,
        outbound: weekCalls.filter(c => c.direction === 'outbound').length,
        answered: weekCalls.filter(c => c.status === 'completed').length,
        missed: weekCalls.filter(c => c.status === 'no-answer').length,
        avgDuration: weekCalls.reduce((acc, c) => acc + (c.duration_seconds || 0), 0) / (weekCalls.filter(c => c.duration_seconds).length || 1)
      },
      monthly: {
        total: monthCalls.length,
        inbound: monthCalls.filter(c => c.direction === 'inbound').length,
        outbound: monthCalls.filter(c => c.direction === 'outbound').length,
        answered: monthCalls.filter(c => c.status === 'completed').length,
        missed: monthCalls.filter(c => c.status === 'no-answer').length,
        avgDuration: monthCalls.reduce((acc, c) => acc + (c.duration_seconds || 0), 0) / (monthCalls.filter(c => c.duration_seconds).length || 1)
      },
      byOutcome: {} as Record<string, number>,
      topContacts: [] as any[]
    }

    // Calculate daily calls for the past week
    const days = eachDayOfInterval({ start: weekAgo, end: now })
    days.forEach(day => {
      const dayStr = format(day, 'EEE')
      const dayCalls = weekCalls.filter(c =>
        format(new Date(c.created_at), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
      )
      analytics.daily[dayStr] = dayCalls.length
    })

    // Calculate by outcome
    const outcomes = ['completed', 'no-answer', 'busy', 'failed']
    outcomes.forEach(outcome => {
      analytics.byOutcome[outcome] = callsData.filter(c => c.status === outcome).length
    })

    // Top contacts by call frequency
    const contactCounts: Record<string, any> = {}
    callsData.forEach(call => {
      if (call.contact) {
        const key = call.contact.id
        if (!contactCounts[key]) {
          contactCounts[key] = {
            contact: call.contact,
            count: 0
          }
        }
        contactCounts[key].count++
      }
    })
    analytics.topContacts = Object.values(contactCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    setCallAnalytics(analytics)
  }

  const loadCallDetails = async (call: Call) => {
    try {
      const { data: notes } = await supabase
        .from('call_notes')
        .select('*')
        .eq('call_id', call.id)
        .order('created_at', { ascending: false })

      if (notes) {
        setCallNotes(notes)
      }

      setCallOutcome(call.outcome || '')
    } catch (error) {
      console.error('Error loading call details:', error)
    }
  }

  const saveCallNote = async () => {
    if (!newNote.trim() || !selectedCall) return

    setSavingNote(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('call_notes')
        .insert([{
          call_id: selectedCall.id,
          content: newNote,
          created_by: user.id
        }])

      if (error) throw error

      setNewNote('')
      await loadCallDetails(selectedCall)
    } catch (error) {
      console.error('Error saving note:', error)
    } finally {
      setSavingNote(false)
    }
  }

  const saveCallOutcome = async () => {
    if (!selectedCall) return

    setSavingOutcome(true)
    try {
      const { error } = await supabase
        .from('calls')
        .update({ outcome: callOutcome })
        .eq('id', selectedCall.id)

      if (error) throw error

      // Update the call in the list
      setCalls(prev => prev.map(c =>
        c.id === selectedCall.id ? { ...c, outcome: callOutcome } : c
      ))
      setSelectedCall(prev => prev ? { ...prev, outcome: callOutcome } : null)
    } catch (error) {
      console.error('Error saving outcome:', error)
    } finally {
      setSavingOutcome(false)
    }
  }

  const scheduleCall = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

      if (!profile?.tenant_id) return

      const scheduledDateTime = `${scheduleForm.scheduled_at}T${scheduleForm.scheduled_time}:00`

      const { error } = await supabase
        .from('call_schedules')
        .insert([{
          contact_id: scheduleForm.contact_id,
          scheduled_at: scheduledDateTime,
          title: scheduleForm.title,
          notes: scheduleForm.notes,
          created_by: user.id,
          tenant_id: profile.tenant_id
        }])

      if (error) throw error

      setShowScheduleDialog(false)
      setScheduleForm({
        contact_id: '',
        scheduled_at: '',
        scheduled_time: '',
        title: '',
        notes: ''
      })
      await loadCalls()
    } catch (error) {
      console.error('Error scheduling call:', error)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    loadCalls()
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
    }
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }
    return phone
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in-progress': return 'bg-blue-100 text-blue-800'
      case 'ringing': return 'bg-yellow-100 text-yellow-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'busy': return 'bg-orange-100 text-orange-800'
      case 'no-answer': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Filter calls based on search and filters
  const filteredCalls = calls.filter(call => {
    const matchesSearch = !searchTerm ||
      call.from_number.includes(searchTerm) ||
      call.to_number.includes(searchTerm) ||
      call.contact?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.contact?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.contact?.company?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesDirection = filterDirection === 'all' || call.direction === filterDirection
    const matchesStatus = filterStatus === 'all' || call.status === filterStatus

    return matchesSearch && matchesDirection && matchesStatus
  })

  // Calculate statistics
  const stats = {
    total: calls.length,
    inbound: calls.filter(c => c.direction === 'inbound').length,
    outbound: calls.filter(c => c.direction === 'outbound').length,
    totalDuration: calls.reduce((acc, call) => acc + (call.duration_seconds || 0), 0),
    answered: calls.filter(c => c.status === 'completed').length,
    missed: calls.filter(c => c.status === 'no-answer').length
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Phone className="h-8 w-8" />
              Call Tracking
            </h1>
            <p className="text-muted-foreground mt-1">
              Track, analyze, and manage all your calls
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowScheduleDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Schedule Call
            </Button>
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="icon"
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="recent">Recent Calls</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
                  <Phone className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.answered} answered, {stats.missed} missed
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Inbound</CardTitle>
                  <PhoneIncoming className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.inbound}</div>
                  <p className="text-xs text-muted-foreground">
                    Received calls
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Outbound</CardTitle>
                  <PhoneOutgoing className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.outbound}</div>
                  <p className="text-xs text-muted-foreground">
                    Made calls
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Duration</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatDuration(stats.totalDuration)}</div>
                  <p className="text-xs text-muted-foreground">
                    Minutes talked
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Stats */}
            {callAnalytics && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>This Week</CardTitle>
                    <CardDescription>Call performance over the last 7 days</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Total Calls</span>
                        <span className="font-semibold">{callAnalytics.weekly.total}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Answer Rate</span>
                        <span className="font-semibold">
                          {callAnalytics.weekly.total > 0
                            ? Math.round((callAnalytics.weekly.answered / callAnalytics.weekly.total) * 100)
                            : 0}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Avg Duration</span>
                        <span className="font-semibold">{formatDuration(Math.round(callAnalytics.weekly.avgDuration))}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Top Contacts</CardTitle>
                    <CardDescription>Most frequently called contacts</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {callAnalytics.topContacts.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No contact data available</p>
                      ) : (
                        callAnalytics.topContacts.map((item: any) => (
                          <div key={item.contact.id} className="flex justify-between items-center">
                            <span className="text-sm">
                              {item.contact.first_name} {item.contact.last_name}
                            </span>
                            <Badge variant="secondary">{item.count} calls</Badge>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="recent" className="space-y-4">
            {/* Search and Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search by number, contact name, or company..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={filterDirection} onValueChange={setFilterDirection}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Direction" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Calls</SelectItem>
                      <SelectItem value="inbound">Inbound</SelectItem>
                      <SelectItem value="outbound">Outbound</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="no-answer">No Answer</SelectItem>
                      <SelectItem value="busy">Busy</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Calls Table */}
            <Card>
              <CardHeader>
                <CardTitle>Call History</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredCalls.length === 0 ? (
                  <div className="text-center py-8">
                    <Phone className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No calls yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Calls will appear here when you receive or make them
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>From</TableHead>
                        <TableHead>To</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCalls.map((call) => (
                        <TableRow
                          key={call.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => {
                            setSelectedCall(call)
                            loadCallDetails(call)
                            setShowCallDetails(true)
                          }}
                        >
                          <TableCell>
                            {call.direction === 'inbound' ? (
                              <PhoneIncoming className="h-4 w-4 text-blue-500" />
                            ) : (
                              <PhoneOutgoing className="h-4 w-4 text-green-500" />
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {formatPhoneNumber(call.from_number)}
                              </div>
                              {call.contact && call.direction === 'inbound' && (
                                <div className="text-xs text-muted-foreground">
                                  {call.contact.first_name} {call.contact.last_name}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {formatPhoneNumber(call.to_number)}
                              </div>
                              {call.contact && call.direction === 'outbound' && (
                                <div className="text-xs text-muted-foreground">
                                  {call.contact.first_name} {call.contact.last_name}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Badge className={getStatusColor(call.status)}>
                                {call.status}
                              </Badge>
                              {call.outcome && (
                                <div className="text-xs text-muted-foreground">
                                  {call.outcome}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{formatDuration(call.duration_seconds)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(call.created_at), { addSuffix: true })}
                          </TableCell>
                          <TableCell>
                            <ClickToCall
                              phoneNumber={
                                call.direction === 'inbound'
                                  ? call.from_number
                                  : call.to_number
                              }
                              size="icon"
                              variant="ghost"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scheduled" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Scheduled Calls</CardTitle>
                <CardDescription>Upcoming calls and reminders</CardDescription>
              </CardHeader>
              <CardContent>
                {scheduledCalls.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No scheduled calls</p>
                    <Button
                      className="mt-4"
                      variant="outline"
                      onClick={() => setShowScheduleDialog(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Schedule a Call
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {scheduledCalls.map((schedule) => (
                      <div key={schedule.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Calendar className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">
                              {schedule.contact ? (
                                <>{schedule.contact.first_name} {schedule.contact.last_name}</>
                              ) : (
                                'Unknown Contact'
                              )}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(schedule.scheduled_at), 'PPp')}
                            </p>
                            {schedule.title && (
                              <p className="text-sm mt-1">{schedule.title}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <ClickToCall
                            phoneNumber=""
                            size="sm"
                            variant="default"
                            label="Call Now"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            {callAnalytics && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Call Volume Trend</CardTitle>
                      <CardDescription>Daily calls over the past week</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Object.entries(callAnalytics.daily).map(([day, count]) => (
                          <div key={day} className="flex items-center justify-between">
                            <span className="text-sm">{day}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-32 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-500 h-2 rounded-full"
                                  style={{ width: `${(count as number / Math.max(...Object.values(callAnalytics.daily) as number[])) * 100}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium w-8">{count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Call Outcomes</CardTitle>
                      <CardDescription>Distribution of call results</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Object.entries(callAnalytics.byOutcome).map(([outcome, count]) => (
                          <div key={outcome} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {outcome === 'completed' && <CheckCircle className="h-4 w-4 text-green-500" />}
                              {outcome === 'no-answer' && <XCircle className="h-4 w-4 text-yellow-500" />}
                              {outcome === 'busy' && <AlertCircle className="h-4 w-4 text-orange-500" />}
                              {outcome === 'failed' && <XCircle className="h-4 w-4 text-red-500" />}
                              <span className="text-sm capitalize">{outcome.replace('-', ' ')}</span>
                            </div>
                            <Badge variant="outline">{count as number}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Performance Metrics</CardTitle>
                    <CardDescription>Key performance indicators</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold">
                          {callAnalytics.weekly.total > 0
                            ? Math.round((callAnalytics.weekly.answered / callAnalytics.weekly.total) * 100)
                            : 0}%
                        </p>
                        <p className="text-sm text-muted-foreground">Answer Rate</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">
                          {formatDuration(Math.round(callAnalytics.weekly.avgDuration))}
                        </p>
                        <p className="text-sm text-muted-foreground">Avg Duration</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">
                          {Math.round(callAnalytics.weekly.total / 7)}
                        </p>
                        <p className="text-sm text-muted-foreground">Calls/Day</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">
                          {callAnalytics.weekly.inbound > 0
                            ? Math.round(callAnalytics.weekly.outbound / callAnalytics.weekly.inbound * 100)
                            : 0}%
                        </p>
                        <p className="text-sm text-muted-foreground">Outbound Ratio</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Call Details Dialog */}
        <Dialog open={showCallDetails} onOpenChange={setShowCallDetails}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Call Details</DialogTitle>
              <DialogDescription>
                {selectedCall && (
                  <span>
                    {selectedCall.direction === 'inbound' ? 'Received from' : 'Made to'}{' '}
                    {selectedCall.direction === 'inbound'
                      ? formatPhoneNumber(selectedCall.from_number)
                      : formatPhoneNumber(selectedCall.to_number)}
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>

            {selectedCall && (
              <div className="space-y-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">Status</Label>
                        <div className="mt-1">
                          <Badge className={getStatusColor(selectedCall.status)}>
                            {selectedCall.status}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Duration</Label>
                        <p className="mt-1">{formatDuration(selectedCall.duration_seconds)}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Date & Time</Label>
                        <p className="mt-1">{format(new Date(selectedCall.created_at), 'PPp')}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Contact</Label>
                        <p className="mt-1">
                          {selectedCall.contact ? (
                            <>{selectedCall.contact.first_name} {selectedCall.contact.last_name}</>
                          ) : (
                            <span className="text-muted-foreground">No contact linked</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <Label className="text-sm text-muted-foreground">Outcome</Label>
                      <div className="flex gap-2 mt-1">
                        <Select value={callOutcome} onValueChange={setCallOutcome}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select outcome" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="qualified_lead">Qualified Lead</SelectItem>
                            <SelectItem value="appointment_scheduled">Appointment Scheduled</SelectItem>
                            <SelectItem value="sale_made">Sale Made</SelectItem>
                            <SelectItem value="follow_up_required">Follow-up Required</SelectItem>
                            <SelectItem value="not_interested">Not Interested</SelectItem>
                            <SelectItem value="wrong_number">Wrong Number</SelectItem>
                            <SelectItem value="voicemail">Left Voicemail</SelectItem>
                            <SelectItem value="callback_requested">Callback Requested</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          onClick={saveCallOutcome}
                          disabled={savingOutcome || !callOutcome}
                        >
                          {savingOutcome ? 'Saving...' : 'Save'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 mb-4">
                      <Textarea
                        placeholder="Add a note about this call..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        onClick={saveCallNote}
                        disabled={!newNote.trim() || savingNote}
                      >
                        {savingNote ? 'Saving...' : 'Add Note'}
                      </Button>
                    </div>

                    {callNotes.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No notes yet</p>
                    ) : (
                      <div className="space-y-2">
                        {callNotes.map((note) => (
                          <div key={note.id} className="p-3 bg-muted rounded-md">
                            <p className="text-sm">{note.content}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Schedule Call Dialog */}
        <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule a Call</DialogTitle>
              <DialogDescription>
                Set a reminder for a future call
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="contact">Contact</Label>
                <Select
                  value={scheduleForm.contact_id}
                  onValueChange={(value) => setScheduleForm({ ...scheduleForm, contact_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a contact" />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.first_name} {contact.last_name}
                        {contact.company && ` - ${contact.company}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={scheduleForm.scheduled_at}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, scheduled_at: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="time">Time</Label>
                  <Input
                    id="time"
                    type="time"
                    value={scheduleForm.scheduled_time}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, scheduled_time: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Follow-up call"
                  value={scheduleForm.title}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, title: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Additional notes about this call..."
                  value={scheduleForm.notes}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={scheduleCall}
                disabled={!scheduleForm.contact_id || !scheduleForm.scheduled_at || !scheduleForm.scheduled_time}
              >
                Schedule Call
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}