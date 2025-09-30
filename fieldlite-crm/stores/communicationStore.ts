import { create } from 'zustand'
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { createClient } from '@/lib/supabase/client'
import type {
  Conversation,
  Message,
  SearchFilters,
  ComposerState,
  Priority,
  ChannelType,
  MessageStatus,
  ConversationStatus,
  Contact,
  MessageTemplate,
  AutomationRule,
  CommunicationMetrics,
  RealtimeEvent
} from '@/types/communications'

interface CommunicationState {
  // Core state
  conversations: Record<string, Conversation>
  messages: Record<string, Message>
  activeConversation: Conversation | null
  contacts: Record<string, Contact>
  templates: MessageTemplate[]

  // UI state
  selectedMessages: Set<string>
  composerState: ComposerState
  filters: SearchFilters
  searchQuery: string
  isLoading: boolean
  error: string | null

  // Real-time state
  typingUsers: Record<string, string[]> // conversationId -> userIds
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting'
  onlineUsers: Set<string>
  unreadNotifications: number

  // Metrics
  metrics: CommunicationMetrics | null

  // Actions - Data
  loadConversations: (filters?: SearchFilters) => Promise<void>
  loadConversation: (id: string) => Promise<void>
  loadMessages: (conversationId: string, limit?: number) => Promise<void>
  createConversation: (data: Partial<Conversation>) => Promise<Conversation>

  // Actions - Conversation
  selectConversation: (id: string | null) => void
  updateConversation: (id: string, updates: Partial<Conversation>) => void
  archiveConversation: (id: string) => Promise<void>
  deleteConversation: (id: string) => Promise<void>
  assignConversation: (id: string, assigneeId: string) => Promise<void>
  tagConversation: (id: string, tags: string[]) => Promise<void>
  setPriority: (id: string, priority: Priority) => Promise<void>
  setStatus: (id: string, status: ConversationStatus) => Promise<void>

  // Actions - Messages
  sendMessage: (message: Partial<Message>) => Promise<void>
  updateMessage: (id: string, updates: Partial<Message>) => void
  deleteMessage: (id: string) => Promise<void>
  markAsRead: (messageIds: string[]) => Promise<void>
  markAsImportant: (messageIds: string[]) => Promise<void>

  // Actions - Composer
  updateComposerState: (updates: Partial<ComposerState>) => void
  resetComposer: () => void
  saveDraft: () => Promise<void>
  loadDraft: (conversationId: string) => Promise<void>

  // Actions - Filters & Search
  updateFilters: (filters: Partial<SearchFilters>) => void
  clearFilters: () => void
  search: (query: string) => Promise<void>

  // Actions - Real-time
  handleRealtimeMessage: (message: Message) => void
  handleRealtimeEvent: (event: RealtimeEvent) => void
  handleTypingStart: (conversationId: string, userId: string) => void
  handleTypingStop: (conversationId: string, userId: string) => void
  handlePresenceChange: (userId: string, status: 'online' | 'offline') => void

  // Actions - Bulk Operations
  bulkAssign: (conversationIds: string[], assigneeId: string) => Promise<void>
  bulkTag: (conversationIds: string[], tags: string[]) => Promise<void>
  bulkArchive: (conversationIds: string[]) => Promise<void>
  bulkDelete: (conversationIds: string[]) => Promise<void>

  // Actions - Templates & Automation
  loadTemplates: () => Promise<void>
  applyTemplate: (templateId: string) => void
  createTemplate: (template: Partial<MessageTemplate>) => Promise<void>
  loadAutomationRules: () => Promise<void>
  triggerAutomation: (ruleId: string, conversationId: string) => Promise<void>

  // Actions - Metrics
  loadMetrics: (dateRange?: { from: string; to: string }) => Promise<void>
  trackMetric: (metric: string, value: any) => void
}

export const useCommunicationStore = create<CommunicationState>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set, get) => ({
          // Initial state
          conversations: {},
          messages: {},
          activeConversation: null,
          contacts: {},
          templates: [],
          selectedMessages: new Set(),
          composerState: {
            channel: 'email' as ChannelType,
            to: [],
            body: '',
            html_body: '',
            attachments: [],
            is_draft: false
          },
          filters: {},
          searchQuery: '',
          isLoading: false,
          error: null,
          typingUsers: {},
          connectionStatus: 'disconnected',
          onlineUsers: new Set(),
          unreadNotifications: 0,
          metrics: null,

          // Actions - Data
          loadConversations: async (filters = {}) => {
            set(draft => { draft.isLoading = true; draft.error = null })

            try {
              const supabase = createClient()
              const { data: { user } } = await supabase.auth.getUser()
              if (!user) throw new Error('Not authenticated')

              const { data: profile } = await supabase
                .from('profiles')
                .select('tenant_id')
                .eq('id', user.id)
                .single()

              if (!profile?.tenant_id) throw new Error('No tenant found')

              // Build query
              let query = supabase
                .from('conversations')
                .select(`
                  *,
                  contact:contacts!contact_id(*),
                  assignee:profiles!assignee_id(*),
                  messages(*)
                `)
                .eq('tenant_id', profile.tenant_id)
                .order('last_message_at', { ascending: false })

              // Apply filters
              if (filters.status?.length) {
                query = query.in('status', filters.status)
              }
              if (filters.channels?.length) {
                query = query.in('channel', filters.channels)
              }
              if (filters.priority?.length) {
                query = query.in('priority', filters.priority)
              }
              if (filters.assignees?.length) {
                query = query.in('assignee_id', filters.assignees)
              }
              if (filters.tags?.length) {
                query = query.contains('tags', filters.tags)
              }
              if (filters.is_unread) {
                query = query.gt('unread_count', 0)
              }

              const { data, error } = await query.limit(50)

              if (error) throw error

              set(draft => {
                draft.conversations = (data || []).reduce((acc, conv) => {
                  acc[conv.id] = conv
                  return acc
                }, {} as Record<string, Conversation>)
                draft.isLoading = false
              })
            } catch (error: any) {
              set(draft => {
                draft.error = error.message
                draft.isLoading = false
              })
            }
          },

          loadConversation: async (id: string) => {
            try {
              const supabase = createClient()
              const { data, error } = await supabase
                .from('conversations')
                .select(`
                  *,
                  contact:contacts!contact_id(*),
                  assignee:profiles!assignee_id(*),
                  messages(*)
                `)
                .eq('id', id)
                .single()

              if (error) throw error

              set(draft => {
                draft.conversations[id] = data
                draft.activeConversation = data
              })
            } catch (error: any) {
              set(draft => { draft.error = error.message })
            }
          },

          loadMessages: async (conversationId: string, limit = 50) => {
            try {
              const supabase = createClient()
              const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: false })
                .limit(limit)

              if (error) throw error

              set(draft => {
                (data || []).forEach(message => {
                  draft.messages[message.id] = message
                })
              })
            } catch (error: any) {
              set(draft => { draft.error = error.message })
            }
          },

          createConversation: async (data: Partial<Conversation>) => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const { data: profile } = await supabase
              .from('profiles')
              .select('tenant_id')
              .eq('id', user.id)
              .single()

            const { data: conversation, error } = await supabase
              .from('conversations')
              .insert({
                ...data,
                tenant_id: profile?.tenant_id,
                assignee_id: user.id,
                status: 'open',
                created_at: new Date().toISOString()
              })
              .select()
              .single()

            if (error) throw error

            set(draft => {
              draft.conversations[conversation.id] = conversation
              draft.activeConversation = conversation
            })

            return conversation
          },

          // Actions - Conversation
          selectConversation: (id: string | null) => {
            set(draft => {
              draft.activeConversation = id ? draft.conversations[id] : null

              // Mark messages as read
              if (id && draft.conversations[id]) {
                const messages = Object.values(draft.messages)
                  .filter(msg => msg.conversation_id === id && !msg.is_read)

                messages.forEach(msg => {
                  msg.is_read = true
                })

                draft.conversations[id].unread_count = 0
              }
            })
          },

          updateConversation: (id: string, updates: Partial<Conversation>) => {
            set(draft => {
              if (draft.conversations[id]) {
                Object.assign(draft.conversations[id], updates)
                if (draft.activeConversation?.id === id) {
                  Object.assign(draft.activeConversation, updates)
                }
              }
            })
          },

          archiveConversation: async (id: string) => {
            try {
              const supabase = createClient()
              const { error } = await supabase
                .from('conversations')
                .update({ status: 'archived' })
                .eq('id', id)

              if (error) throw error

              set(draft => {
                if (draft.conversations[id]) {
                  draft.conversations[id].status = 'archived'
                }
                if (draft.activeConversation?.id === id) {
                  draft.activeConversation = null
                }
              })
            } catch (error: any) {
              set(draft => { draft.error = error.message })
            }
          },

          deleteConversation: async (id: string) => {
            try {
              const supabase = createClient()
              const { error } = await supabase
                .from('conversations')
                .delete()
                .eq('id', id)

              if (error) throw error

              set(draft => {
                delete draft.conversations[id]
                if (draft.activeConversation?.id === id) {
                  draft.activeConversation = null
                }
              })
            } catch (error: any) {
              set(draft => { draft.error = error.message })
            }
          },

          assignConversation: async (id: string, assigneeId: string) => {
            try {
              const supabase = createClient()
              const { error } = await supabase
                .from('conversations')
                .update({ assignee_id: assigneeId })
                .eq('id', id)

              if (error) throw error

              set(draft => {
                if (draft.conversations[id]) {
                  draft.conversations[id].assignee_id = assigneeId
                }
              })
            } catch (error: any) {
              set(draft => { draft.error = error.message })
            }
          },

          tagConversation: async (id: string, tags: string[]) => {
            try {
              const supabase = createClient()
              const { error } = await supabase
                .from('conversations')
                .update({ tags })
                .eq('id', id)

              if (error) throw error

              set(draft => {
                if (draft.conversations[id]) {
                  draft.conversations[id].tags = tags
                }
              })
            } catch (error: any) {
              set(draft => { draft.error = error.message })
            }
          },

          setPriority: async (id: string, priority: Priority) => {
            try {
              const supabase = createClient()
              const { error } = await supabase
                .from('conversations')
                .update({ priority })
                .eq('id', id)

              if (error) throw error

              set(draft => {
                if (draft.conversations[id]) {
                  draft.conversations[id].priority = priority
                }
              })
            } catch (error: any) {
              set(draft => { draft.error = error.message })
            }
          },

          setStatus: async (id: string, status: ConversationStatus) => {
            try {
              const supabase = createClient()
              const { error } = await supabase
                .from('conversations')
                .update({ status })
                .eq('id', id)

              if (error) throw error

              set(draft => {
                if (draft.conversations[id]) {
                  draft.conversations[id].status = status
                }
              })
            } catch (error: any) {
              set(draft => { draft.error = error.message })
            }
          },

          // Actions - Messages
          sendMessage: async (messageData: Partial<Message>) => {
            const tempId = `temp-${Date.now()}`
            const message: Message = {
              id: tempId,
              status: 'sending' as MessageStatus,
              direction: 'outbound',
              is_read: true,
              is_important: false,
              is_archived: false,
              is_internal: false,
              tags: [],
              created_at: new Date().toISOString(),
              ...messageData
            } as Message

            // Optimistic update
            set(draft => {
              draft.messages[tempId] = message
              if (message.conversation_id && draft.conversations[message.conversation_id]) {
                draft.conversations[message.conversation_id].messages = [
                  ...(draft.conversations[message.conversation_id].messages || []),
                  message
                ]
                draft.conversations[message.conversation_id].last_message_at = message.created_at
                draft.conversations[message.conversation_id].message_count++
              }
            })

            try {
              const supabase = createClient()

              // Send based on channel
              let endpoint = ''
              switch (message.channel) {
                case 'email':
                  endpoint = '/api/email/send'
                  break
                case 'sms':
                  endpoint = '/api/twilio/sms/send'
                  break
                case 'voice':
                  endpoint = '/api/twilio/voice/call'
                  break
                default:
                  throw new Error(`Unsupported channel: ${message.channel}`)
              }

              const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(messageData)
              })

              const sentMessage = await response.json()

              // Update with real message
              set(draft => {
                delete draft.messages[tempId]
                draft.messages[sentMessage.id] = sentMessage

                if (sentMessage.conversation_id && draft.conversations[sentMessage.conversation_id]) {
                  const messages = draft.conversations[sentMessage.conversation_id].messages || []
                  const tempIndex = messages.findIndex(m => m.id === tempId)

                  if (tempIndex >= 0) {
                    messages[tempIndex] = sentMessage
                  }

                  draft.conversations[sentMessage.conversation_id].messages = messages
                }
              })
            } catch (error: any) {
              set(draft => {
                draft.messages[tempId].status = 'failed' as MessageStatus
                draft.error = error.message
              })
            }
          },

          updateMessage: (id: string, updates: Partial<Message>) => {
            set(draft => {
              if (draft.messages[id]) {
                Object.assign(draft.messages[id], updates)
              }
            })
          },

          deleteMessage: async (id: string) => {
            try {
              const supabase = createClient()
              const { error } = await supabase
                .from('messages')
                .delete()
                .eq('id', id)

              if (error) throw error

              set(draft => {
                delete draft.messages[id]
              })
            } catch (error: any) {
              set(draft => { draft.error = error.message })
            }
          },

          markAsRead: async (messageIds: string[]) => {
            try {
              const supabase = createClient()
              const { error } = await supabase
                .from('messages')
                .update({ is_read: true })
                .in('id', messageIds)

              if (error) throw error

              set(draft => {
                messageIds.forEach(id => {
                  if (draft.messages[id]) {
                    draft.messages[id].is_read = true
                  }
                })
              })
            } catch (error: any) {
              set(draft => { draft.error = error.message })
            }
          },

          markAsImportant: async (messageIds: string[]) => {
            try {
              const supabase = createClient()
              const { error } = await supabase
                .from('messages')
                .update({ is_important: true })
                .in('id', messageIds)

              if (error) throw error

              set(draft => {
                messageIds.forEach(id => {
                  if (draft.messages[id]) {
                    draft.messages[id].is_important = true
                  }
                })
              })
            } catch (error: any) {
              set(draft => { draft.error = error.message })
            }
          },

          // Actions - Composer
          updateComposerState: (updates: Partial<ComposerState>) => {
            set(draft => {
              Object.assign(draft.composerState, updates)
            })
          },

          resetComposer: () => {
            set(draft => {
              draft.composerState = {
                channel: 'email' as ChannelType,
                to: [],
                body: '',
                html_body: '',
                attachments: [],
                is_draft: false
              }
            })
          },

          saveDraft: async () => {
            const state = get()
            const draft = state.composerState

            try {
              const supabase = createClient()
              const { error } = await supabase
                .from('drafts')
                .upsert({
                  id: draft.draft_id,
                  conversation_id: state.activeConversation?.id,
                  content: JSON.stringify(draft),
                  updated_at: new Date().toISOString()
                })

              if (error) throw error
            } catch (error: any) {
              set(draft => { draft.error = error.message })
            }
          },

          loadDraft: async (conversationId: string) => {
            try {
              const supabase = createClient()
              const { data, error } = await supabase
                .from('drafts')
                .select('*')
                .eq('conversation_id', conversationId)
                .single()

              if (error) throw error
              if (data) {
                set(draft => {
                  draft.composerState = JSON.parse(data.content)
                })
              }
            } catch (error: any) {
              set(draft => { draft.error = error.message })
            }
          },

          // Actions - Filters & Search
          updateFilters: (filters: Partial<SearchFilters>) => {
            set(draft => {
              draft.filters = { ...draft.filters, ...filters }
            })
            get().loadConversations(get().filters)
          },

          clearFilters: () => {
            set(draft => {
              draft.filters = {}
            })
            get().loadConversations()
          },

          search: async (query: string) => {
            set(draft => {
              draft.searchQuery = query
              draft.isLoading = true
            })

            try {
              const supabase = createClient()

              // Sanitize query: escape special characters for ILIKE pattern matching
              // Prevent SQL injection by escaping %, _, and \ characters
              const sanitizedQuery = query
                .replace(/\\/g, '\\\\')  // Escape backslashes first
                .replace(/%/g, '\\%')    // Escape % wildcard
                .replace(/_/g, '\\_')    // Escape _ wildcard

              // Use textSearch with properly escaped pattern
              // Note: Supabase client properly parameterizes this
              const searchPattern = `%${sanitizedQuery}%`

              const { data, error } = await supabase
                .from('conversations')
                .select(`
                  *,
                  contact:contacts!contact_id(*),
                  messages(*)
                `)
                .or(`subject.ilike.${searchPattern},messages.body.ilike.${searchPattern}`)
                .limit(50)

              if (error) throw error

              set(draft => {
                draft.conversations = (data || []).reduce((acc, conv) => {
                  acc[conv.id] = conv
                  return acc
                }, {} as Record<string, Conversation>)
                draft.isLoading = false
              })
            } catch (error: any) {
              set(draft => {
                draft.error = error.message
                draft.isLoading = false
              })
            }
          },

          // Actions - Real-time
          handleRealtimeMessage: (message: Message) => {
            set(draft => {
              draft.messages[message.id] = message

              if (draft.conversations[message.conversation_id]) {
                const conversation = draft.conversations[message.conversation_id]
                const existingIndex = conversation.messages?.findIndex(m => m.id === message.id)

                if (existingIndex !== undefined && existingIndex >= 0 && conversation.messages) {
                  conversation.messages[existingIndex] = message
                } else {
                  conversation.messages = [...(conversation.messages || []), message]
                }

                conversation.last_message_at = message.created_at
                conversation.message_count = (conversation.message_count || 0) + 1

                if (message.direction === 'inbound' && !message.is_read) {
                  conversation.unread_count = (conversation.unread_count || 0) + 1
                }
              }

              // Update unread notifications
              if (message.direction === 'inbound' && !message.is_read) {
                draft.unreadNotifications++
              }
            })
          },

          handleRealtimeEvent: (event: RealtimeEvent) => {
            const { type, conversation_id, user_id, data } = event

            switch (type) {
              case 'typing':
                if (conversation_id && user_id) {
                  get().handleTypingStart(conversation_id, user_id)
                }
                break
              case 'presence':
                if (user_id && data?.status) {
                  get().handlePresenceChange(user_id, data.status)
                }
                break
              case 'status_change':
                if (conversation_id && data?.status) {
                  get().updateConversation(conversation_id, { status: data.status })
                }
                break
            }
          },

          handleTypingStart: (conversationId: string, userId: string) => {
            set(draft => {
              if (!draft.typingUsers[conversationId]) {
                draft.typingUsers[conversationId] = []
              }
              if (!draft.typingUsers[conversationId].includes(userId)) {
                draft.typingUsers[conversationId].push(userId)
              }
            })

            // Clear typing after 3 seconds
            setTimeout(() => {
              get().handleTypingStop(conversationId, userId)
            }, 3000)
          },

          handleTypingStop: (conversationId: string, userId: string) => {
            set(draft => {
              if (draft.typingUsers[conversationId]) {
                draft.typingUsers[conversationId] = draft.typingUsers[conversationId]
                  .filter(id => id !== userId)
              }
            })
          },

          handlePresenceChange: (userId: string, status: 'online' | 'offline') => {
            set(draft => {
              if (status === 'online') {
                draft.onlineUsers.add(userId)
              } else {
                draft.onlineUsers.delete(userId)
              }
            })
          },

          // Actions - Bulk Operations
          bulkAssign: async (conversationIds: string[], assigneeId: string) => {
            try {
              const supabase = createClient()
              const { error } = await supabase
                .from('conversations')
                .update({ assignee_id: assigneeId })
                .in('id', conversationIds)

              if (error) throw error

              set(draft => {
                conversationIds.forEach(id => {
                  if (draft.conversations[id]) {
                    draft.conversations[id].assignee_id = assigneeId
                  }
                })
              })
            } catch (error: any) {
              set(draft => { draft.error = error.message })
            }
          },

          bulkTag: async (conversationIds: string[], tags: string[]) => {
            try {
              const supabase = createClient()
              const { error } = await supabase
                .from('conversations')
                .update({ tags })
                .in('id', conversationIds)

              if (error) throw error

              set(draft => {
                conversationIds.forEach(id => {
                  if (draft.conversations[id]) {
                    draft.conversations[id].tags = tags
                  }
                })
              })
            } catch (error: any) {
              set(draft => { draft.error = error.message })
            }
          },

          bulkArchive: async (conversationIds: string[]) => {
            try {
              const supabase = createClient()
              const { error } = await supabase
                .from('conversations')
                .update({ status: 'archived' })
                .in('id', conversationIds)

              if (error) throw error

              set(draft => {
                conversationIds.forEach(id => {
                  if (draft.conversations[id]) {
                    draft.conversations[id].status = 'archived'
                  }
                })
              })
            } catch (error: any) {
              set(draft => { draft.error = error.message })
            }
          },

          bulkDelete: async (conversationIds: string[]) => {
            try {
              const supabase = createClient()
              const { error } = await supabase
                .from('conversations')
                .delete()
                .in('id', conversationIds)

              if (error) throw error

              set(draft => {
                conversationIds.forEach(id => {
                  delete draft.conversations[id]
                })
              })
            } catch (error: any) {
              set(draft => { draft.error = error.message })
            }
          },

          // Actions - Templates & Automation
          loadTemplates: async () => {
            try {
              const supabase = createClient()
              const { data, error } = await supabase
                .from('message_templates')
                .select('*')
                .eq('is_active', true)

              if (error) throw error

              set(draft => {
                draft.templates = data || []
              })
            } catch (error: any) {
              set(draft => { draft.error = error.message })
            }
          },

          applyTemplate: (templateId: string) => {
            const template = get().templates.find(t => t.id === templateId)
            if (template) {
              set(draft => {
                draft.composerState.subject = template.subject
                draft.composerState.body = template.body
                draft.composerState.html_body = template.html_body || ''
              })
            }
          },

          createTemplate: async (template: Partial<MessageTemplate>) => {
            try {
              const supabase = createClient()
              const { data, error } = await supabase
                .from('message_templates')
                .insert(template)
                .select()
                .single()

              if (error) throw error

              set(draft => {
                draft.templates.push(data)
              })
            } catch (error: any) {
              set(draft => { draft.error = error.message })
            }
          },

          loadAutomationRules: async () => {
            // Implementation for loading automation rules
          },

          triggerAutomation: async (ruleId: string, conversationId: string) => {
            // Implementation for triggering automation
          },

          // Actions - Metrics
          loadMetrics: async (dateRange?) => {
            try {
              const supabase = createClient()

              // Load various metrics
              const { data: conversationStats } = await supabase
                .from('conversations')
                .select('status, priority, channel')

              // Process metrics
              const metrics: CommunicationMetrics = {
                total_conversations: conversationStats?.length || 0,
                open_conversations: conversationStats?.filter(c => c.status === 'open').length || 0,
                avg_response_time: 0,
                avg_resolution_time: 0,
                sla_compliance_rate: 0,
                messages_sent_today: 0,
                messages_received_today: 0,
                by_channel: {},
                by_status: {},
                by_priority: {},
                top_agents: []
              }

              set(draft => {
                draft.metrics = metrics
              })
            } catch (error: any) {
              set(draft => { draft.error = error.message })
            }
          },

          trackMetric: (metric: string, value: any) => {
            // Implementation for tracking custom metrics
            console.log('Tracking metric:', metric, value)
          }
        }))
      ),
      {
        name: 'communication-store',
        partialize: (state) => ({
          filters: state.filters,
          composerState: state.composerState,
          searchQuery: state.searchQuery
        })
      }
    ),
    { name: 'communication-store' }
  )
)