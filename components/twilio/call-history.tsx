'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  Calendar,
  Play,
  Download,
  MessageSquare,
  Loader2
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Call {
  id: string
  from_number: string
  to_number: string
  direction: 'inbound' | 'outbound'
  status: string
  duration_seconds: number
  created_at: string
  recording_url?: string
  transcription?: string
  notes?: string
  user?: {
    full_name: string
  }
}

interface CallHistoryProps {
  contactId?: string
  dealId?: string
  jobId?: string
  limit?: number
}

export function CallHistory({ contactId, dealId, jobId, limit = 10 }: CallHistoryProps) {
  const [calls, setCalls] = useState<Call[]>([])
  const [loading, setLoading] = useState(true)
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    loadCalls()
  }, [contactId, dealId, jobId])

  const loadCalls = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('calls')
        .select(`
          *,
          user:user_id(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (contactId) {
        query = query.eq('contact_id', contactId)
      }
      if (dealId) {
        query = query.eq('deal_id', dealId)
      }
      if (jobId) {
        query = query.eq('job_id', jobId)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error loading calls:', error)
      } else {
        setCalls(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (seconds: number) => {
    if (!seconds) return 'N/A'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success'
      case 'in-progress': return 'warning'
      case 'failed': return 'destructive'
      case 'busy': return 'secondary'
      case 'no-answer': return 'secondary'
      default: return 'default'
    }
  }

  const saveNote = async (callId: string) => {
    setSavingNote(true)
    try {
      const { error } = await supabase
        .from('calls')
        .update({ notes: noteText })
        .eq('id', callId)

      if (!error) {
        const updatedCalls = calls.map(call =>
          call.id === callId ? { ...call, notes: noteText } : call
        )
        setCalls(updatedCalls)
        setEditingNote(null)
        setNoteText('')
      }
    } catch (error) {
      console.error('Error saving note:', error)
    } finally {
      setSavingNote(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  if (calls.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Phone className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No calls recorded yet</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Call History</CardTitle>
        <CardDescription>Recent calls and recordings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {calls.map((call) => (
          <div key={call.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                {call.direction === 'inbound' ? (
                  <PhoneIncoming className="h-5 w-5 text-green-600 mt-0.5" />
                ) : (
                  <PhoneOutgoing className="h-5 w-5 text-blue-600 mt-0.5" />
                )}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {call.direction === 'inbound' ? call.from_number : call.to_number}
                    </span>
                    <Badge variant={getStatusColor(call.status) as any}>
                      {call.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDuration(call.duration_seconds)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDistanceToNow(new Date(call.created_at), { addSuffix: true })}
                    </span>
                    {call.user && (
                      <span>by {call.user.full_name}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                {call.recording_url && (
                  <Button size="sm" variant="outline">
                    <Play className="h-3 w-3 mr-1" />
                    Play
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingNote(call.id)
                    setNoteText(call.notes || '')
                  }}
                >
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Note
                </Button>
              </div>
            </div>

            {editingNote === call.id && (
              <div className="space-y-2 pt-2 border-t">
                <Textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Add notes about this call..."
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => saveNote(call.id)}
                    disabled={savingNote}
                  >
                    {savingNote && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                    Save Note
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingNote(null)
                      setNoteText('')
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {call.notes && editingNote !== call.id && (
              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground">{call.notes}</p>
              </div>
            )}

            {call.transcription && (
              <div className="pt-2 border-t">
                <p className="text-sm font-medium mb-1">Transcription:</p>
                <p className="text-sm text-muted-foreground">{call.transcription}</p>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}