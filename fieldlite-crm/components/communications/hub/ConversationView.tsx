'use client'

import { useRef, useEffect, useState } from 'react'
import { format, isToday, isYesterday } from 'date-fns'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import type { Conversation, Message, ChannelType } from '@/types/communications'
import {
  Phone, Mail, MessageSquare, PhoneCall, PhoneOff,
  Download, Paperclip, ExternalLink, Copy, MoreVertical,
  Reply, Forward, Trash2, Flag, CheckCircle
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface ConversationViewProps {
  conversation: Conversation
  onReply?: (message: Message) => void
  onForward?: (message: Message) => void
  onReact?: (messageId: string, reaction: string) => void
}

const MessageItem = ({
  message,
  isGrouped,
  onReply,
  onForward,
  onReact
}: {
  message: Message
  isGrouped?: boolean
  onReply?: (message: Message) => void
  onForward?: (message: Message) => void
  onReact?: (messageId: string, reaction: string) => void
}) => {
  const isInbound = message.direction === 'inbound'
  const isInternal = message.is_internal

  // Format timestamp
  const formatTimestamp = (date: string) => {
    const d = new Date(date)
    if (isToday(d)) {
      return format(d, 'HH:mm')
    } else if (isYesterday(d)) {
      return `Yesterday ${format(d, 'HH:mm')}`
    } else {
      return format(d, 'MMM d, HH:mm')
    }
  }

  // Render channel-specific content
  const renderContent = () => {
    switch (message.channel) {
      case 'email':
        return (
          <div className="space-y-2">
            {message.subject && (
              <div className="font-medium text-sm">{message.subject}</div>
            )}
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{
                __html: message.html_body || message.body || ''
              }}
            />
          </div>
        )

      case 'voice':
      case 'voicemail':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <PhoneCall className="h-4 w-4" />
              <span className="text-sm">
                {message.channel === 'voice' ? 'Phone Call' : 'Voicemail'}
              </span>
              {message.metadata?.duration_seconds && (
                <Badge variant="outline" className="text-xs">
                  {Math.floor(message.metadata.duration_seconds / 60)}:
                  {(message.metadata.duration_seconds % 60).toString().padStart(2, '0')}
                </Badge>
              )}
            </div>
            {message.metadata?.transcript && (
              <div className="text-sm bg-muted p-2 rounded">
                <div className="text-xs text-muted-foreground mb-1">Transcript:</div>
                {message.metadata.transcript}
              </div>
            )}
            {message.metadata?.recording_url && (
              <Button size="sm" variant="outline" asChild>
                <a href={message.metadata.recording_url} target="_blank" rel="noopener noreferrer">
                  <Download className="h-3 w-3 mr-1" />
                  Download Recording
                </a>
              </Button>
            )}
          </div>
        )

      case 'sms':
      case 'mms':
      case 'whatsapp':
      default:
        return (
          <div className="text-sm whitespace-pre-wrap">
            {message.body}
            {message.metadata?.media_urls && message.metadata.media_urls.length > 0 && (
              <div className="mt-2 space-y-1">
                {message.metadata.media_urls.map((url, idx) => (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <Paperclip className="h-3 w-3" />
                    Media attachment {idx + 1}
                  </a>
                ))}
              </div>
            )}
          </div>
        )
    }
  }

  return (
    <div className={cn(
      "group relative flex gap-3 px-4 py-2 hover:bg-muted/30",
      !isGrouped && "mt-4",
      isInternal && "bg-yellow-50 border-l-4 border-yellow-400"
    )}>
      {/* Avatar */}
      {!isGrouped && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          {message.from.avatar_url ? (
            <AvatarImage src={message.from.avatar_url} />
          ) : (
            <AvatarFallback className="text-xs">
              {message.from.name?.[0] || message.from.type[0].toUpperCase()}
            </AvatarFallback>
          )}
        </Avatar>
      )}
      {isGrouped && <div className="w-8" />}

      {/* Content */}
      <div className="flex-1 min-w-0">
        {!isGrouped && (
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">
              {message.from.name || message.from.email || message.from.phone || 'Unknown'}
            </span>
            {isInternal && (
              <Badge variant="outline" className="text-xs bg-yellow-100">
                Internal Note
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {formatTimestamp(message.created_at)}
            </span>
            {message.status === 'failed' && (
              <Badge variant="destructive" className="text-xs">
                Failed to send
              </Badge>
            )}
          </div>
        )}

        {renderContent()}

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 space-y-1">
            {message.attachments.map((attachment) => (
              <a
                key={attachment.id}
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
              >
                <Paperclip className="h-3 w-3" />
                {attachment.filename}
                <span className="text-xs text-muted-foreground">
                  ({(attachment.size / 1024).toFixed(1)} KB)
                </span>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
        {!isInternal && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => onReply?.(message)}
                >
                  <Reply className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reply</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => onForward?.(message)}
                >
                  <Forward className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Forward</TooltipContent>
            </Tooltip>
          </>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="h-7 w-7">
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(message.body || '')}>
              <Copy className="h-3 w-3 mr-2" />
              Copy text
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onReact?.(message.id, 'important')}>
              <Flag className="h-3 w-3 mr-2" />
              Mark as important
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              <Trash2 className="h-3 w-3 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

export function ConversationView({
  conversation,
  onReply,
  onForward,
  onReact
}: ConversationViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [conversation.messages, autoScroll])

  // Group messages by sender and time proximity
  const groupedMessages = useMemo(() => {
    if (!conversation.messages) return []

    const groups: { date: string; messages: Message[] }[] = []
    let currentDate = ''

    conversation.messages.forEach((message, index) => {
      const messageDate = format(new Date(message.created_at), 'yyyy-MM-dd')

      if (messageDate !== currentDate) {
        currentDate = messageDate
        groups.push({
          date: messageDate,
          messages: [message]
        })
      } else {
        groups[groups.length - 1].messages.push(message)
      }
    })

    return groups
  }, [conversation.messages])

  // Format date header
  const formatDateHeader = (date: string) => {
    const d = new Date(date)
    if (isToday(d)) return 'Today'
    if (isYesterday(d)) return 'Yesterday'
    return format(d, 'EEEE, MMMM d, yyyy')
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-4 py-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar>
              {conversation.contact?.avatar_url ? (
                <AvatarImage src={conversation.contact.avatar_url} />
              ) : (
                <AvatarFallback>
                  {conversation.contact?.first_name?.[0]}
                  {conversation.contact?.last_name?.[0]}
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <div className="font-medium">
                {conversation.contact ?
                  `${conversation.contact.first_name} ${conversation.contact.last_name}` :
                  conversation.subject || 'Unknown Contact'
                }
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                {conversation.contact?.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {conversation.contact.email}
                  </span>
                )}
                {conversation.contact?.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {conversation.contact.phone}
                  </span>
                )}
                {conversation.contact?.company && (
                  <span>• {conversation.contact.company}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {conversation.status === 'open' && (
              <Badge variant="outline" className="bg-green-50">
                Open
              </Badge>
            )}
            {conversation.priority && conversation.priority !== 'normal' && (
              <Badge variant={conversation.priority === 'urgent' ? 'destructive' : 'secondary'}>
                {conversation.priority}
              </Badge>
            )}
            {conversation.sla?.breached && (
              <Badge variant="destructive">
                SLA Breached
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        onScroll={(e) => {
          const el = e.currentTarget
          const isAtBottom = el.scrollHeight - el.scrollTop === el.clientHeight
          setAutoScroll(isAtBottom)
        }}
      >
        {groupedMessages.map((group) => (
          <div key={group.date}>
            {/* Date separator */}
            <div className="sticky top-0 z-10 flex items-center justify-center py-2 bg-background/95 backdrop-blur">
              <div className="px-3 py-1 bg-muted rounded-full text-xs font-medium">
                {formatDateHeader(group.date)}
              </div>
            </div>

            {/* Messages in group */}
            {group.messages.map((message, index) => {
              const prevMessage = index > 0 ? group.messages[index - 1] : null
              const isGrouped = prevMessage &&
                prevMessage.from.id === message.from.id &&
                new Date(message.created_at).getTime() - new Date(prevMessage.created_at).getTime() < 60000

              return (
                <MessageItem
                  key={message.id}
                  message={message}
                  isGrouped={isGrouped}
                  onReply={onReply}
                  onForward={onForward}
                  onReact={onReact}
                />
              )
            })}
          </div>
        ))}

        {/* Empty state */}
        {(!conversation.messages || conversation.messages.length === 0) && (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto opacity-50 mb-2" />
              <p>No messages yet</p>
              <p className="text-sm">Send a message to start the conversation</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}