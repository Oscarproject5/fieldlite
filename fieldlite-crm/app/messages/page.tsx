'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  MessageSquare,
  Search,
  Plus,
  Send,
  Inbox,
  Filter,
  Phone,
  Mail,
  Clock
} from 'lucide-react'

interface Message {
  id: string
  type: string
  direction: string
  from: string
  to: string
  content: string
  status: string
  contact_id: string
  created_at: string
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const supabase = createClient()

  useEffect(() => {
    loadMessages()
  }, [])

  const loadMessages = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading messages:', error)
      } else {
        setMessages(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredMessages = messages.filter(message =>
    message.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    message.from?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    message.to?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'sms': return <MessageSquare className="h-4 w-4" />
      case 'email': return <Mail className="h-4 w-4" />
      case 'call': return <Phone className="h-4 w-4" />
      default: return <MessageSquare className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'sent': return 'success'
      case 'delivered': return 'success'
      case 'failed': return 'destructive'
      case 'pending': return 'warning'
      default: return 'default'
    }
  }

  const inboxCount = messages.filter(m => m.direction === 'inbound').length
  const sentCount = messages.filter(m => m.direction === 'outbound').length

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <MessageSquare className="h-8 w-8" />
              Messages
            </h1>
            <p className="text-muted-foreground mt-2">
              View and manage all communications
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Message
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inbox</CardTitle>
              <Inbox className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inboxCount}</div>
              <p className="text-xs text-muted-foreground">
                Received messages
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sent</CardTitle>
              <Send className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sentCount}</div>
              <p className="text-xs text-muted-foreground">
                Outbound messages
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{messages.length}</div>
              <p className="text-xs text-muted-foreground">
                All time messages
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
                  placeholder="Search messages..."
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
          <div className="text-center py-8">Loading messages...</div>
        ) : filteredMessages.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">No messages found</p>
              <p className="text-sm text-gray-400 mt-2">
                Messages will appear here when you start communicating with contacts
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredMessages.map((message) => (
              <Card key={message.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(message.type)}
                          <span className="font-medium">
                            {message.direction === 'inbound' ? message.from : message.to}
                          </span>
                        </div>
                        <Badge variant={message.direction === 'inbound' ? 'secondary' : 'default' as any}>
                          {message.direction}
                        </Badge>
                        <Badge variant={getStatusColor(message.status) as any}>
                          {message.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">{message.content}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(message.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">View</Button>
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