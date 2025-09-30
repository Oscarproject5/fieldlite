'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Conversation, Priority, Task, Deal } from '@/types/communications'
import {
  X, User, Building, DollarSign, Calendar, Tag, Clock,
  AlertCircle, CheckCircle, Phone, Mail, MapPin,
  FileText, Link2, ExternalLink, Plus
} from 'lucide-react'

interface ConversationSidebarProps {
  conversation: Conversation
  onAssign: (conversationId: string, assigneeId: string) => void
  onTag: (conversationId: string, tags: string[]) => void
  onPriority: (conversationId: string, priority: Priority) => void
  onClose: () => void
}

export function ConversationSidebar({
  conversation,
  onAssign,
  onTag,
  onPriority,
  onClose
}: ConversationSidebarProps) {
  const [newTag, setNewTag] = useState('')
  const [tags, setTags] = useState(conversation.tags || [])

  // Add tag
  const handleAddTag = () => {
    if (newTag && !tags.includes(newTag)) {
      const updatedTags = [...tags, newTag]
      setTags(updatedTags)
      onTag(conversation.id, updatedTags)
      setNewTag('')
    }
  }

  // Remove tag
  const handleRemoveTag = (tag: string) => {
    const updatedTags = tags.filter(t => t !== tag)
    setTags(updatedTags)
    onTag(conversation.id, updatedTags)
  }

  return (
    <div className="h-full flex flex-col bg-background border-l">
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <h3 className="font-medium">Details</h3>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <Tabs defaultValue="contact" className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="contact">Contact</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          {/* Contact Tab */}
          <TabsContent value="contact" className="p-4 space-y-4">
            {conversation.contact ? (
              <>
                {/* Contact Info */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      {conversation.contact.avatar_url ? (
                        <AvatarImage src={conversation.contact.avatar_url} />
                      ) : (
                        <AvatarFallback>
                          {conversation.contact.first_name?.[0]}
                          {conversation.contact.last_name?.[0]}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <div className="font-medium">
                        {conversation.contact.first_name} {conversation.contact.last_name}
                      </div>
                      {conversation.contact.company && (
                        <div className="text-sm text-muted-foreground">
                          {conversation.contact.company}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Contact Details */}
                  <div className="space-y-2">
                    {conversation.contact.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <a
                          href={`mailto:${conversation.contact.email}`}
                          className="text-blue-600 hover:underline"
                        >
                          {conversation.contact.email}
                        </a>
                      </div>
                    )}

                    {conversation.contact.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <a
                          href={`tel:${conversation.contact.phone}`}
                          className="text-blue-600 hover:underline"
                        >
                          {conversation.contact.phone}
                        </a>
                      </div>
                    )}

                    {conversation.contact.company && (
                      <div className="flex items-center gap-2 text-sm">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        {conversation.contact.company}
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Company Info */}
                {conversation.company && (
                  <>
                    <div>
                      <Label className="text-xs text-muted-foreground">Company</Label>
                      <div className="mt-1 p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{conversation.company.name}</div>
                          <Button size="icon" variant="ghost" className="h-6 w-6">
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                        {conversation.company.industry && (
                          <div className="text-sm text-muted-foreground">
                            {conversation.company.industry}
                          </div>
                        )}
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Deal Info */}
                {conversation.deal && (
                  <>
                    <div>
                      <Label className="text-xs text-muted-foreground">Related Deal</Label>
                      <div className="mt-1 p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{conversation.deal.name}</div>
                          <Badge variant="outline">
                            {conversation.deal.stage}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            ${(conversation.deal.value / 1000).toFixed(0)}k
                          </span>
                          {conversation.deal.close_date && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(conversation.deal.close_date), 'MMM d')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Separator />
                  </>
                )}
              </>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No contact information</p>
              </div>
            )}
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details" className="p-4 space-y-4">
            {/* Assignment */}
            <div>
              <Label className="text-xs text-muted-foreground">Assigned To</Label>
              <Select
                value={conversation.assignee_id || ''}
                onValueChange={(value) => onAssign(conversation.id, value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {/* Add team members here */}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div>
              <Label className="text-xs text-muted-foreground">Priority</Label>
              <Select
                value={conversation.priority || 'normal'}
                onValueChange={(value: Priority) => onPriority(conversation.id, value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">
                    <span className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-red-500" />
                      Urgent
                    </span>
                  </SelectItem>
                  <SelectItem value="high">
                    <span className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-orange-500" />
                      High
                    </span>
                  </SelectItem>
                  <SelectItem value="normal">
                    <span className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-blue-500" />
                      Normal
                    </span>
                  </SelectItem>
                  <SelectItem value="low">
                    <span className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-gray-500" />
                      Low
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              <div className="mt-1 p-2 border rounded-lg bg-muted/50">
                <Badge
                  variant={conversation.status === 'open' ? 'default' : 'secondary'}
                >
                  {conversation.status}
                </Badge>
              </div>
            </div>

            {/* Tags */}
            <div>
              <Label className="text-xs text-muted-foreground">Tags</Label>
              <div className="mt-1 space-y-2">
                <div className="flex flex-wrap gap-1">
                  {tags.map(tag => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="gap-1"
                    >
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-1">
                  <Input
                    placeholder="Add tag..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddTag()
                      }
                    }}
                    className="h-8"
                  />
                  <Button
                    size="sm"
                    onClick={handleAddTag}
                    className="h-8"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>

            {/* SLA Status */}
            {conversation.sla && (
              <>
                <Separator />
                <div>
                  <Label className="text-xs text-muted-foreground">SLA Status</Label>
                  <div className="mt-1 space-y-2">
                    {conversation.sla.breached ? (
                      <div className="flex items-center gap-2 text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">SLA Breached</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">SLA On Track</span>
                      </div>
                    )}

                    {conversation.sla.next_response_due && (
                      <div className="text-sm text-muted-foreground">
                        Next response due:{' '}
                        {format(new Date(conversation.sla.next_response_due), 'MMM d, HH:mm')}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="p-4 space-y-4">
            <div className="space-y-3">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 border rounded-lg">
                  <div className="text-xs text-muted-foreground">Messages</div>
                  <div className="text-lg font-medium">
                    {conversation.message_count || 0}
                  </div>
                </div>
                <div className="p-2 border rounded-lg">
                  <div className="text-xs text-muted-foreground">Unread</div>
                  <div className="text-lg font-medium">
                    {conversation.unread_count || 0}
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Timeline</Label>
                <div className="space-y-2 text-sm">
                  {conversation.created_at && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Created</span>
                      <span>{format(new Date(conversation.created_at), 'MMM d, HH:mm')}</span>
                    </div>
                  )}
                  {conversation.first_message_at && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">First message</span>
                      <span>{format(new Date(conversation.first_message_at), 'MMM d, HH:mm')}</span>
                    </div>
                  )}
                  {conversation.last_message_at && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Last message</span>
                      <span>{format(new Date(conversation.last_message_at), 'MMM d, HH:mm')}</span>
                    </div>
                  )}
                  {conversation.response_time_seconds && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Response time</span>
                      <span>{Math.round(conversation.response_time_seconds / 60)} min</span>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Quick Actions */}
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Quick Actions</Label>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <FileText className="h-4 w-4 mr-2" />
                    Create Task
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Create Deal
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule Meeting
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}