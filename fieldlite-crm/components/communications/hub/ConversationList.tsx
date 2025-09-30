'use client'

import { forwardRef, useRef, useEffect, useMemo, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { cn } from '@/lib/utils'
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import type { Conversation, ChannelType, Priority } from '@/types/communications'
import {
  Phone, MessageSquare, Mail, Video, Clock, CheckCircle2, Circle,
  AlertCircle, Star, Archive, Pin, MoreHorizontal, Hash,
  PhoneIncoming, PhoneOutgoing, Voicemail, Users
} from 'lucide-react'

interface ConversationListProps {
  conversations: Conversation[]
  selectedId?: string
  selectedIds?: Set<string>
  onSelect: (id: string) => void
  onMultiSelect?: (id: string) => void
  viewMode?: 'list' | 'grid'
  isLoading?: boolean
  onLoadMore?: () => void
}

const ConversationListItem = ({
  conversation,
  isSelected,
  isMultiSelected,
  onSelect,
  onMultiSelect,
  style
}: {
  conversation: Conversation
  isSelected: boolean
  isMultiSelected: boolean
  onSelect: () => void
  onMultiSelect?: () => void
  style?: React.CSSProperties
}) => {
  const lastMessage = conversation.messages?.[conversation.messages.length - 1]
  const hasUnread = conversation.unread_count > 0

  // Format timestamp
  const formatTimestamp = (date: string) => {
    const d = new Date(date)
    if (isToday(d)) {
      return format(d, 'HH:mm')
    } else if (isYesterday(d)) {
      return 'Yesterday'
    } else {
      return format(d, 'MMM d')
    }
  }

  // Get channel icon
  const getChannelIcon = (channel: ChannelType) => {
    const icons = {
      email: <Mail className="h-4 w-4" />,
      sms: <MessageSquare className="h-4 w-4" />,
      mms: <MessageSquare className="h-4 w-4" />,
      voice: <Phone className="h-4 w-4" />,
      voicemail: <Voicemail className="h-4 w-4" />,
      whatsapp: <MessageSquare className="h-4 w-4 text-green-500" />,
      webchat: <MessageSquare className="h-4 w-4 text-blue-500" />,
      in_app: <Hash className="h-4 w-4" />
    }
    return icons[channel] || <MessageSquare className="h-4 w-4" />
  }

  // Get priority color
  const getPriorityColor = (priority: Priority) => {
    const colors = {
      urgent: 'text-red-500 bg-red-50',
      high: 'text-orange-500 bg-orange-50',
      normal: 'text-blue-500 bg-blue-50',
      low: 'text-gray-500 bg-gray-50'
    }
    return colors[priority] || colors.normal
  }

  // Get SLA indicator
  const getSLAIndicator = () => {
    if (!conversation.sla) return null

    const now = Date.now()
    const dueTime = conversation.sla.next_response_due
      ? new Date(conversation.sla.next_response_due).getTime()
      : null

    if (!dueTime) return null

    const timeLeft = dueTime - now
    const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60))

    if (conversation.sla.breached) {
      return <Badge variant="destructive" className="text-xs">SLA Breached</Badge>
    } else if (hoursLeft < 1) {
      return <Badge variant="warning" className="text-xs">SLA &lt; 1h</Badge>
    } else if (hoursLeft < 4) {
      return <Badge variant="secondary" className="text-xs">SLA {hoursLeft}h</Badge>
    }
    return null
  }

  return (
    <div
      style={style}
      onClick={onSelect}
      className={cn(
        "group relative px-4 py-3 border-b hover:bg-muted/50 cursor-pointer transition-colors",
        isSelected && "bg-primary/5 border-l-2 border-l-primary",
        hasUnread && "font-semibold"
      )}
    >
      {/* Multi-select checkbox */}
      {onMultiSelect && (
        <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Checkbox
            checked={isMultiSelected}
            onCheckedChange={() => onMultiSelect()}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <div className={cn(
        "flex items-start gap-3",
        onMultiSelect && "group-hover:ml-6 transition-all"
      )}>
        {/* Avatar */}
        <Avatar className="h-10 w-10 flex-shrink-0">
          {conversation.contact?.avatar_url ? (
            <AvatarImage src={conversation.contact.avatar_url} />
          ) : (
            <AvatarFallback>
              {conversation.contact?.first_name?.[0]}
              {conversation.contact?.last_name?.[0]}
            </AvatarFallback>
          )}
        </Avatar>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-sm truncate",
                hasUnread ? "font-semibold" : "font-medium"
              )}>
                {conversation.contact ?
                  `${conversation.contact.first_name} ${conversation.contact.last_name}` :
                  conversation.subject || 'Unknown'
                }
              </span>
              {conversation.contact?.company && (
                <span className="text-xs text-muted-foreground">
                  {conversation.contact.company}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {conversation.priority && conversation.priority !== 'normal' && (
                <Badge
                  variant="outline"
                  className={cn("text-xs h-5", getPriorityColor(conversation.priority))}
                >
                  {conversation.priority}
                </Badge>
              )}
              {getSLAIndicator()}
              <span className="text-xs text-muted-foreground">
                {conversation.last_message_at && formatTimestamp(conversation.last_message_at)}
              </span>
            </div>
          </div>

          {/* Subject / Preview */}
          <div className="flex items-center gap-2 mb-1">
            {getChannelIcon(conversation.channel)}
            <p className={cn(
              "text-sm truncate flex-1",
              hasUnread ? "text-foreground" : "text-muted-foreground"
            )}>
              {conversation.subject || lastMessage?.preview || lastMessage?.body || 'No messages'}
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Tags */}
              {conversation.tags?.slice(0, 2).map(tag => (
                <Badge key={tag} variant="outline" className="text-xs h-5">
                  {tag}
                </Badge>
              ))}
              {conversation.tags && conversation.tags.length > 2 && (
                <span className="text-xs text-muted-foreground">
                  +{conversation.tags.length - 2}
                </span>
              )}

              {/* Assignee */}
              {conversation.assignee && (
                <div className="flex items-center gap-1">
                  <Avatar className="h-5 w-5">
                    {conversation.assignee.avatar_url ? (
                      <AvatarImage src={conversation.assignee.avatar_url} />
                    ) : (
                      <AvatarFallback className="text-xs">
                        {conversation.assignee.name?.[0]}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <span className="text-xs text-muted-foreground">
                    {conversation.assignee.name}
                  </span>
                </div>
              )}
            </div>

            {/* Indicators */}
            <div className="flex items-center gap-1">
              {hasUnread && (
                <Badge variant="default" className="h-5 w-5 p-0 flex items-center justify-center">
                  {conversation.unread_count}
                </Badge>
              )}
              {conversation.participants && conversation.participants.length > 2 && (
                <Users className="h-3 w-3 text-muted-foreground" />
              )}
              {conversation.status === 'resolved' && (
                <CheckCircle2 className="h-3 w-3 text-green-500" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export const ConversationList = forwardRef<HTMLDivElement, ConversationListProps>(
  ({
    conversations,
    selectedId,
    selectedIds,
    onSelect,
    onMultiSelect,
    viewMode = 'list',
    isLoading = false,
    onLoadMore
  }, ref) => {
    const parentRef = useRef<HTMLDivElement>(null)
    const [groupedConversations, setGroupedConversations] = useState<Record<string, Conversation[]>>({})

    // Group conversations by date
    useEffect(() => {
      const grouped: Record<string, Conversation[]> = {}

      conversations.forEach(conv => {
        const date = conv.last_message_at || conv.created_at
        const d = new Date(date)
        let key: string

        if (isToday(d)) {
          key = 'Today'
        } else if (isYesterday(d)) {
          key = 'Yesterday'
        } else {
          key = format(d, 'MMMM d, yyyy')
        }

        if (!grouped[key]) {
          grouped[key] = []
        }
        grouped[key].push(conv)
      })

      setGroupedConversations(grouped)
    }, [conversations])

    // Virtual list for performance
    const virtualizer = useVirtualizer({
      count: conversations.length,
      getScrollElement: () => parentRef.current,
      estimateSize: () => 88, // Estimated height of each item
      overscan: 10
    })

    // Handle infinite scroll
    useEffect(() => {
      const items = virtualizer.getVirtualItems()
      const lastItem = items[items.length - 1]

      if (
        lastItem &&
        lastItem.index >= conversations.length - 1 &&
        !isLoading &&
        onLoadMore
      ) {
        onLoadMore()
      }
    }, [virtualizer.getVirtualItems(), conversations.length, isLoading, onLoadMore])

    if (isLoading && conversations.length === 0) {
      return (
        <div className="p-4 space-y-3">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-[150px]" />
              </div>
            </div>
          ))}
        </div>
      )
    }

    if (conversations.length === 0) {
      return (
        <div className="h-full flex items-center justify-center text-muted-foreground">
          <div className="text-center space-y-2">
            <MessageSquare className="h-12 w-12 mx-auto opacity-50" />
            <p>No conversations found</p>
            <p className="text-sm">Try adjusting your filters</p>
          </div>
        </div>
      )
    }

    if (viewMode === 'grid') {
      return (
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {conversations.map(conversation => (
            <div
              key={conversation.id}
              onClick={() => onSelect(conversation.id)}
              className={cn(
                "p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer",
                selectedId === conversation.id && "ring-2 ring-primary"
              )}
            >
              {/* Grid item content */}
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {conversation.contact?.first_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <Badge variant="outline" className="text-xs">
                    {conversation.channel}
                  </Badge>
                </div>
                <div>
                  <p className="font-medium text-sm truncate">
                    {conversation.contact ?
                      `${conversation.contact.first_name} ${conversation.contact.last_name}` :
                      'Unknown'
                    }
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {conversation.subject || 'No subject'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )
    }

    return (
      <div ref={parentRef} className="h-full overflow-auto">
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative'
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const conversation = conversations[virtualItem.index]
            return (
              <ConversationListItem
                key={conversation.id}
                conversation={conversation}
                isSelected={selectedId === conversation.id}
                isMultiSelected={selectedIds?.has(conversation.id) || false}
                onSelect={() => onSelect(conversation.id)}
                onMultiSelect={onMultiSelect ? () => onMultiSelect(conversation.id) : undefined}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`
                }}
              />
            )
          })}
        </div>

        {isLoading && conversations.length > 0 && (
          <div className="p-4 flex justify-center">
            <div className="text-sm text-muted-foreground">Loading more...</div>
          </div>
        )}
      </div>
    )
  }
)

ConversationList.displayName = 'ConversationList'