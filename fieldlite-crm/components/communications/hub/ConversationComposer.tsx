'use client'

import { forwardRef, useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import type { Conversation, Message, ComposerState, ChannelType } from '@/types/communications'
import { useCommunicationStore } from '@/stores/communicationStore'
import {
  Send, Paperclip, AtSign, Hash, Clock, ChevronDown,
  Phone, Mail, MessageSquare, X, AlertCircle
} from 'lucide-react'

interface ConversationComposerProps {
  conversation: Conversation
  mode?: 'inline' | 'modal' | 'sidebar'
  onSend: (message: Partial<Message>) => Promise<void>
  onSaveDraft?: (draft: ComposerState) => void
  className?: string
}

export const ConversationComposer = forwardRef<HTMLDivElement, ConversationComposerProps>(
  ({ conversation, mode = 'inline', onSend, onSaveDraft, className }, ref) => {
    const {
      composerState,
      updateComposerState,
      resetComposer,
      templates,
      loadTemplates
    } = useCommunicationStore()

    const [sending, setSending] = useState(false)
    const [attachments, setAttachments] = useState<File[]>([])
    const [charCount, setCharCount] = useState(0)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Load templates on mount
    useEffect(() => {
      loadTemplates()
    }, [])

    // Auto-save draft every 10 seconds
    useEffect(() => {
      if (composerState.body && composerState.is_draft) {
        const timer = setInterval(() => {
          onSaveDraft?.(composerState)
        }, 10000)
        return () => clearInterval(timer)
      }
    }, [composerState, onSaveDraft])

    // Update character count for SMS
    useEffect(() => {
      if (composerState.channel === 'sms' || composerState.channel === 'mms') {
        setCharCount(composerState.body.length)
      }
    }, [composerState.body, composerState.channel])

    // Handle send
    const handleSend = async () => {
      if (!composerState.body.trim() && attachments.length === 0) return

      setSending(true)
      try {
        const message: Partial<Message> = {
          conversation_id: conversation.id,
          channel: composerState.channel,
          direction: 'outbound',
          from: {
            type: 'user',
            // User info will be filled by the backend
          },
          to: composerState.to,
          subject: composerState.subject,
          body: composerState.body,
          html_body: composerState.html_body,
          attachments: [], // Will handle file uploads
          status: 'sending',
          created_at: new Date().toISOString()
        }

        await onSend(message)
        resetComposer()
        setAttachments([])
      } catch (error) {
        console.error('Failed to send message:', error)
      } finally {
        setSending(false)
      }
    }

    // Handle file selection
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || [])
      setAttachments(prev => [...prev, ...files])
    }

    // Remove attachment
    const removeAttachment = (index: number) => {
      setAttachments(prev => prev.filter((_, i) => i !== index))
    }

    // Insert template
    const insertTemplate = (templateId: string) => {
      const template = templates.find(t => t.id === templateId)
      if (template) {
        updateComposerState({
          body: composerState.body + template.body,
          subject: template.subject || composerState.subject
        })
      }
    }

    // Get channel icon
    const getChannelIcon = (channel: ChannelType) => {
      switch (channel) {
        case 'email':
          return <Mail className="h-4 w-4" />
        case 'sms':
        case 'mms':
          return <MessageSquare className="h-4 w-4" />
        case 'voice':
          return <Phone className="h-4 w-4" />
        default:
          return <MessageSquare className="h-4 w-4" />
      }
    }

    // Check if can send via channel
    const canSendViaChannel = (channel: ChannelType) => {
      switch (channel) {
        case 'email':
          return conversation.contact?.email
        case 'sms':
        case 'mms':
        case 'voice':
          return conversation.contact?.phone
        default:
          return true
      }
    }

    return (
      <div
        ref={ref}
        className={cn(
          "border-t bg-background",
          mode === 'inline' && "p-4",
          mode === 'modal' && "p-6",
          mode === 'sidebar' && "p-4 border-l",
          className
        )}
      >
        {/* Channel selector and options */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Select
              value={composerState.channel}
              onValueChange={(value: ChannelType) => updateComposerState({ channel: value })}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue>
                  <span className="flex items-center gap-2">
                    {getChannelIcon(composerState.channel)}
                    <span className="capitalize">{composerState.channel}</span>
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email" disabled={!canSendViaChannel('email')}>
                  <span className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </span>
                </SelectItem>
                <SelectItem value="sms" disabled={!canSendViaChannel('sms')}>
                  <span className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    SMS
                  </span>
                </SelectItem>
                <SelectItem value="voice" disabled={!canSendViaChannel('voice')}>
                  <span className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Call
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Templates */}
            {templates.length > 0 && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Hash className="h-4 w-4 mr-1" />
                    Templates
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Quick Templates</h4>
                    {templates.slice(0, 5).map(template => (
                      <button
                        key={template.id}
                        onClick={() => insertTemplate(template.id)}
                        className="w-full text-left p-2 hover:bg-muted rounded text-sm"
                      >
                        <div className="font-medium">{template.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {template.body}
                        </div>
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* Character count for SMS */}
          {(composerState.channel === 'sms' || composerState.channel === 'mms') && (
            <div className="text-xs text-muted-foreground">
              {charCount} / 160 ({Math.ceil(charCount / 160)} segment{Math.ceil(charCount / 160) !== 1 ? 's' : ''})
            </div>
          )}
        </div>

        {/* Email subject */}
        {composerState.channel === 'email' && (
          <Input
            placeholder="Subject"
            value={composerState.subject || ''}
            onChange={(e) => updateComposerState({ subject: e.target.value })}
            className="mb-3"
          />
        )}

        {/* Message input */}
        <Textarea
          ref={textareaRef}
          placeholder={
            composerState.channel === 'email'
              ? "Type your email message..."
              : composerState.channel === 'sms'
              ? "Type your SMS message (160 chars per segment)..."
              : "Type your message..."
          }
          value={composerState.body}
          onChange={(e) => updateComposerState({ body: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              handleSend()
            }
          }}
          className="min-h-[100px] resize-none"
          disabled={sending}
        />

        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="mt-2 space-y-1">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-muted rounded text-sm"
              >
                <span className="flex items-center gap-2">
                  <Paperclip className="h-3 w-3" />
                  {file.name}
                  <span className="text-xs text-muted-foreground">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => removeAttachment(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            {/* Attach file */}
            {(composerState.channel === 'email' || composerState.channel === 'mms') && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={sending}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
              </>
            )}

            {/* Schedule send */}
            <Button variant="outline" size="sm" disabled={sending}>
              <Clock className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {/* Save draft */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSaveDraft?.(composerState)}
              disabled={sending || !composerState.body}
            >
              Save Draft
            </Button>

            {/* Send */}
            <Button
              onClick={handleSend}
              disabled={sending || (!composerState.body.trim() && attachments.length === 0)}
              className="gap-2"
            >
              {sending ? (
                <>Sending...</>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Warnings */}
        {composerState.channel === 'sms' && charCount > 160 && (
          <div className="mt-2 flex items-center gap-2 text-xs text-amber-600">
            <AlertCircle className="h-3 w-3" />
            Message will be sent as {Math.ceil(charCount / 160)} segments
          </div>
        )}

        {!canSendViaChannel(composerState.channel) && (
          <div className="mt-2 flex items-center gap-2 text-xs text-red-600">
            <AlertCircle className="h-3 w-3" />
            Contact has no {composerState.channel === 'email' ? 'email address' : 'phone number'}
          </div>
        )}
      </div>
    )
  }
)

ConversationComposer.displayName = 'ConversationComposer'