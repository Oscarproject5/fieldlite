'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { useVirtualizer } from '@tanstack/react-virtual'
import { format, formatDistanceToNow } from 'date-fns'
import { AnimatePresence, motion } from 'framer-motion'
import { useCommunicationStore } from '@/stores/communicationStore'
import { ConversationList } from './ConversationList'
import { ConversationView } from './ConversationView'
import { ConversationComposer } from './ConversationComposer'
import { ConversationSidebar } from './ConversationSidebar'
import { SearchCommand } from './SearchCommand'
import { ContactsView } from './ContactsView'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { Conversation, Message, SearchFilters, QueueType, Priority, ChannelType } from '@/types/communications'
import {
  Phone, MessageSquare, Mail, Video, Search, Filter, Plus, Settings,
  Archive, Trash2, Star, Clock, CheckCircle, XCircle, AlertCircle,
  PhoneCall, PhoneIncoming, PhoneOutgoing, MessageCircle,
  AtSign, Hash, Users, Inbox, Send, FileText, Bot, Zap,
  ChevronLeft, ChevronRight, LayoutGrid, List, Maximize2,
  Bell, BellOff, MoreHorizontal, RefreshCw, Download, Upload
} from 'lucide-react'

interface CommunicationHubProps {
  defaultQueue?: QueueType
  defaultFilters?: SearchFilters
  onConversationSelect?: (conversation: Conversation) => void
}

export function CommunicationHub({
  defaultQueue = 'personal',
  defaultFilters = {},
  onConversationSelect
}: CommunicationHubProps) {
  // Store
  const {
    conversations,
    activeConversation,
    filters,
    isLoading,
    composerState,
    typingUsers,
    connectionStatus,
    loadConversations,
    selectConversation,
    updateFilters,
    sendMessage,
    markAsRead,
    archiveConversation,
    assignConversation,
    tagConversation,
    setPriority
  } = useCommunicationStore()

  // Local State
  const [selectedQueue, setSelectedQueue] = useState<QueueType>(defaultQueue)
  const [searchOpen, setSearchOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [selectedConversations, setSelectedConversations] = useState<Set<string>>(new Set())
  const [composerMode, setComposerMode] = useState<'inline' | 'modal' | 'sidebar'>('inline')

  // Refs
  const conversationListRef = useRef<HTMLDivElement>(null)
  const composerRef = useRef<HTMLDivElement>(null)

  // Real-time subscriptions
  useEffect(() => {
    const supabase = createClient()

    // Get user tenant_id for filtering real-time subscriptions
    let conversationChannel: any
    let messageChannel: any
    let typingChannel: any

    const setupSubscriptions = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

      if (!profile?.tenant_id) {
        console.error('No tenant_id found for user')
        return
      }

      // Subscribe to conversation changes (filtered by tenant_id)
      conversationChannel = supabase
        .channel('conversations')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `tenant_id=eq.${profile.tenant_id}`
        }, (payload) => {
          loadConversations(filters)
        })
        .subscribe()

      // Subscribe to message changes (filtered by tenant_id)
      messageChannel = supabase
        .channel('messages')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `tenant_id=eq.${profile.tenant_id}`
        }, (payload) => {
          // Handle new message
          const message = payload.new as Message
          useCommunicationStore.getState().handleRealtimeMessage(message)
        })
        .subscribe()

      // Subscribe to typing indicators (scoped to tenant via presence)
      typingChannel = supabase
        .channel(`typing:${profile.tenant_id}`)
        .on('presence', { event: 'sync' }, () => {
          const state = typingChannel.presenceState()
          // Update typing users
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          // User started typing
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          // User stopped typing
        })
        .subscribe()
    }

    setupSubscriptions()

    return () => {
      conversationChannel?.unsubscribe()
      messageChannel?.unsubscribe()
      typingChannel?.unsubscribe()
    }
  }, [filters])

  // Load initial data
  useEffect(() => {
    loadConversations({ ...defaultFilters, queue: selectedQueue })
  }, [selectedQueue])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Global shortcuts
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case 'k':
            e.preventDefault()
            setSearchOpen(true)
            break
          case 'n':
            e.preventDefault()
            // New conversation
            break
          case 'e':
            e.preventDefault()
            // Archive selected
            handleBulkArchive()
            break
          case 'd':
            e.preventDefault()
            // Delete selected
            handleBulkDelete()
            break
        }
      }

      // Navigation shortcuts
      if (!e.metaKey && !e.ctrlKey && !e.altKey) {
        switch (e.key) {
          case 'j':
            // Next conversation
            navigateConversation('next')
            break
          case 'k':
            // Previous conversation
            navigateConversation('prev')
            break
          case 'Enter':
            if (e.shiftKey) {
              // Open in new tab
            } else {
              // Open conversation
            }
            break
          case 'r':
            // Reply
            composerRef.current?.focus()
            break
          case 'a':
            // Archive
            if (activeConversation) {
              archiveConversation(activeConversation.id)
            }
            break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeConversation, selectedConversations])

  // Navigation helpers
  const navigateConversation = (direction: 'next' | 'prev') => {
    const conversationArray = Object.values(conversations)
    const currentIndex = conversationArray.findIndex(c => c.id === activeConversation?.id)

    let newIndex
    if (direction === 'next') {
      newIndex = Math.min(currentIndex + 1, conversationArray.length - 1)
    } else {
      newIndex = Math.max(currentIndex - 1, 0)
    }

    if (conversationArray[newIndex]) {
      selectConversation(conversationArray[newIndex].id)
    }
  }

  // Bulk actions
  const handleBulkArchive = () => {
    selectedConversations.forEach(id => {
      archiveConversation(id)
    })
    setSelectedConversations(new Set())
  }

  const handleBulkDelete = () => {
    // Implement bulk delete
    setSelectedConversations(new Set())
  }

  const handleBulkAssign = (userId: string) => {
    selectedConversations.forEach(id => {
      assignConversation(id, userId)
    })
    setSelectedConversations(new Set())
  }

  // Queue counts
  const queueCounts = useMemo(() => {
    const counts: Record<QueueType, number> = {
      personal: 0,
      team: 0,
      unassigned: 0,
      escalations: 0,
      sla_breach: 0,
      scheduled: 0,
      drafts: 0,
      spam: 0
    }

    Object.values(conversations).forEach(conv => {
      if (conv.queue) {
        counts[conv.queue]++
      }
    })

    return counts
  }, [conversations])

  // Render queue icon
  const getQueueIcon = (queue: QueueType) => {
    const icons = {
      personal: <Inbox className="h-4 w-4" />,
      team: <Users className="h-4 w-4" />,
      unassigned: <MessageCircle className="h-4 w-4" />,
      escalations: <AlertCircle className="h-4 w-4" />,
      sla_breach: <Clock className="h-4 w-4" />,
      scheduled: <Send className="h-4 w-4" />,
      drafts: <FileText className="h-4 w-4" />,
      spam: <XCircle className="h-4 w-4" />
    }
    return icons[queue] || <MessageCircle className="h-4 w-4" />
  }

  return (
    <TooltipProvider>
      <div className="h-screen flex flex-col bg-background">
        {/* Header */}
        <header className="border-b px-4 py-2 flex items-center justify-between bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>

            <h1 className="text-xl font-semibold">Communications</h1>

            <Badge variant="outline" className="gap-1">
              <div className={cn(
                "h-2 w-2 rounded-full",
                connectionStatus === 'connected' ? 'bg-green-500' :
                connectionStatus === 'reconnecting' ? 'bg-yellow-500' : 'bg-red-500'
              )} />
              {connectionStatus}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="h-4 w-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Quick Filters</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => updateFilters({ is_unread: true })}>
                  Unread only
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateFilters({ is_important: true })}>
                  Important
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateFilters({ has_attachments: true })}>
                  With attachments
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => updateFilters({})}>
                  Clear filters
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
            >
              {viewMode === 'list' ? <LayoutGrid className="h-4 w-4" /> : <List className="h-4 w-4" />}
            </Button>

            <Button variant="default" size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              New Message
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Queues & Filters */}
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.aside
                initial={{ width: 0 }}
                animate={{ width: 240 }}
                exit={{ width: 0 }}
                className="border-r bg-muted/30 overflow-y-auto"
              >
                <div className="p-4 space-y-4">
                  {/* Queues */}
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Queues
                    </h3>
                    <nav className="space-y-1">
                      {Object.entries(queueCounts).map(([queue, count]) => (
                        <button
                          key={queue}
                          onClick={() => setSelectedQueue(queue as QueueType)}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors",
                            selectedQueue === queue
                              ? "bg-primary/10 text-primary"
                              : "hover:bg-muted"
                          )}
                        >
                          <span className="flex items-center gap-2">
                            {getQueueIcon(queue as QueueType)}
                            <span className="capitalize">{queue.replace('_', ' ')}</span>
                          </span>
                          {count > 0 && (
                            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                              {count}
                            </Badge>
                          )}
                        </button>
                      ))}
                    </nav>
                  </div>

                  {/* Saved Filters */}
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Saved Filters
                    </h3>
                    <nav className="space-y-1">
                      <button className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-muted">
                        <span className="flex items-center gap-2">
                          <Star className="h-4 w-4" />
                          VIP Customers
                        </span>
                      </button>
                      <button className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-muted">
                        <span className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          High Priority
                        </span>
                      </button>
                      <button className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-muted">
                        <span className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Pending Response
                        </span>
                      </button>
                    </nav>
                  </div>

                  {/* Tags */}
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Tags
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-xs cursor-pointer hover:bg-muted">
                        support
                      </Badge>
                      <Badge variant="outline" className="text-xs cursor-pointer hover:bg-muted">
                        billing
                      </Badge>
                      <Badge variant="outline" className="text-xs cursor-pointer hover:bg-muted">
                        feature-request
                      </Badge>
                      <Badge variant="outline" className="text-xs cursor-pointer hover:bg-muted">
                        bug
                      </Badge>
                    </div>
                  </div>
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* Main Content Area with Tabs */}
          <Tabs defaultValue="conversations" className="flex-1 flex flex-col">
            <div className="border-b px-4">
              <TabsList className="h-12">
                <TabsTrigger value="conversations" className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Conversations
                  {Object.keys(conversations).length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                      {Object.keys(conversations).length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="contacts" className="gap-2">
                  <Users className="h-4 w-4" />
                  Contacts
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Conversations Tab */}
            <TabsContent value="conversations" className="flex-1 m-0 p-0">
              <ResizablePanelGroup direction="horizontal" className="h-full">
                {/* Conversation List */}
                <ResizablePanel defaultSize={35} minSize={25} maxSize={50}>
                  <ConversationList
                    ref={conversationListRef}
                    conversations={Object.values(conversations)}
                    selectedId={activeConversation?.id}
                    selectedIds={selectedConversations}
                    onSelect={(id) => {
                      selectConversation(id)
                      onConversationSelect?.(conversations[id])
                    }}
                    onMultiSelect={(id) => {
                      const newSelected = new Set(selectedConversations)
                      if (newSelected.has(id)) {
                        newSelected.delete(id)
                      } else {
                        newSelected.add(id)
                      }
                      setSelectedConversations(newSelected)
                    }}
                    viewMode={viewMode}
                    isLoading={isLoading}
                  />
                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* Conversation View & Composer */}
                <ResizablePanel defaultSize={65}>
                  <div className="h-full flex flex-col">
                    {activeConversation ? (
                      <>
                        <ConversationView
                          conversation={activeConversation}
                          onReply={(message) => {
                            // Set up reply
                          }}
                          onForward={(message) => {
                            // Set up forward
                          }}
                          onReact={(messageId, reaction) => {
                            // Add reaction
                          }}
                        />
                        <ConversationComposer
                          ref={composerRef}
                          conversation={activeConversation}
                          mode={composerMode}
                          onSend={sendMessage}
                          onSaveDraft={(draft) => {
                            // Save draft
                          }}
                        />
                      </>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        <div className="text-center space-y-2">
                          <MessageSquare className="h-12 w-12 mx-auto opacity-50" />
                          <p>Select a conversation to view messages</p>
                        </div>
                      </div>
                    )}
                  </div>
                </ResizablePanel>

                {/* Right Sidebar - Context & Actions */}
                {!rightPanelCollapsed && activeConversation && (
                  <>
                    <ResizableHandle withHandle />
                    <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
                      <ConversationSidebar
                        conversation={activeConversation}
                        onAssign={assignConversation}
                        onTag={tagConversation}
                        onPriority={setPriority}
                        onClose={() => setRightPanelCollapsed(true)}
                      />
                    </ResizablePanel>
                  </>
                )}
              </ResizablePanelGroup>
            </TabsContent>

            {/* Contacts Tab */}
            <TabsContent value="contacts" className="flex-1 m-0 p-0">
              <ContactsView
                onContactSelect={(contact) => {
                  // Could open conversation with this contact
                  console.log('Selected contact:', contact)
                }}
                onStartConversation={(contact, channel) => {
                  // Start a new conversation with this contact
                  console.log('Start conversation:', contact, channel)
                  // You could switch to conversations tab and create new conversation
                }}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Search Command Palette */}
        <SearchCommand
          open={searchOpen}
          onOpenChange={setSearchOpen}
          onSelect={(conversation) => {
            selectConversation(conversation.id)
            setSearchOpen(false)
          }}
        />
      </div>
    </TooltipProvider>
  )
}