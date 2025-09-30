'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import type { Conversation } from '@/types/communications'
import {
  Search, Phone, Mail, MessageSquare, User, Building,
  Calendar, Hash, Clock, AlertCircle
} from 'lucide-react'

interface SearchCommandProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (conversation: Conversation) => void
}

export function SearchCommand({ open, onOpenChange, onSelect }: SearchCommandProps) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<{
    conversations: Conversation[]
    contacts: any[]
    companies: any[]
  }>({
    conversations: [],
    contacts: [],
    companies: []
  })
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  // Debounced search
  useEffect(() => {
    if (!search || search.length < 2) {
      setResults({ conversations: [], contacts: [], companies: [] })
      return
    }

    const timer = setTimeout(() => {
      performSearch(search)
    }, 300)

    return () => clearTimeout(timer)
  }, [search])

  const performSearch = async (query: string) => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

      if (!profile?.tenant_id) return

      // Search conversations
      const { data: conversations } = await supabase
        .from('conversations')
        .select(`
          *,
          contact:contacts!contact_id(*),
          company:companies!company_id(*),
          messages(*)
        `)
        .eq('tenant_id', profile.tenant_id)
        .or(`subject.ilike.%${query}%`)
        .limit(5)

      // Search contacts
      const { data: contacts } = await supabase
        .from('contacts')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%,company.ilike.%${query}%`)
        .limit(5)

      // Search companies
      const { data: companies } = await supabase
        .from('companies')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .or(`name.ilike.%${query}%`)
        .limit(3)

      setResults({
        conversations: conversations || [],
        contacts: contacts || [],
        companies: companies || []
      })
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search conversations, contacts, companies..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        {loading ? (
          <CommandEmpty>Searching...</CommandEmpty>
        ) : search.length < 2 ? (
          <CommandEmpty>Type at least 2 characters to search</CommandEmpty>
        ) : (
          <>
            {/* Recent Conversations */}
            {results.conversations.length > 0 && (
              <CommandGroup heading="Conversations">
                {results.conversations.map((conversation) => (
                  <CommandItem
                    key={conversation.id}
                    value={conversation.id}
                    onSelect={() => {
                      onSelect(conversation)
                      onOpenChange(false)
                    }}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <Avatar className="h-8 w-8">
                        {conversation.contact?.avatar_url ? (
                          <AvatarImage src={conversation.contact.avatar_url} />
                        ) : (
                          <AvatarFallback className="text-xs">
                            {conversation.contact?.first_name?.[0]}
                            {conversation.contact?.last_name?.[0]}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">
                            {conversation.contact ?
                              `${conversation.contact.first_name} ${conversation.contact.last_name}` :
                              conversation.subject || 'Unknown'
                            }
                          </span>
                          {conversation.unread_count > 0 && (
                            <Badge variant="default" className="h-5 px-1.5 text-xs">
                              {conversation.unread_count}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {getChannelIcon(conversation.channel)}
                          <span className="truncate">
                            {conversation.subject || conversation.messages?.[0]?.preview || 'No messages'}
                          </span>
                        </div>
                      </div>
                      {conversation.priority && conversation.priority !== 'normal' && (
                        <Badge variant="outline" className="text-xs">
                          {conversation.priority}
                        </Badge>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {results.conversations.length > 0 && (results.contacts.length > 0 || results.companies.length > 0) && (
              <CommandSeparator />
            )}

            {/* Contacts */}
            {results.contacts.length > 0 && (
              <CommandGroup heading="Contacts">
                {results.contacts.map((contact) => (
                  <CommandItem
                    key={contact.id}
                    value={contact.id}
                    onSelect={() => {
                      // Create or find conversation with this contact
                      onOpenChange(false)
                    }}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">
                          {contact.first_name} {contact.last_name}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {contact.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {contact.email}
                            </span>
                          )}
                          {contact.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {contact.phone}
                            </span>
                          )}
                        </div>
                      </div>
                      {contact.company && (
                        <Badge variant="secondary" className="text-xs">
                          {contact.company}
                        </Badge>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {results.contacts.length > 0 && results.companies.length > 0 && (
              <CommandSeparator />
            )}

            {/* Companies */}
            {results.companies.length > 0 && (
              <CommandGroup heading="Companies">
                {results.companies.map((company) => (
                  <CommandItem
                    key={company.id}
                    value={company.id}
                    onSelect={() => {
                      // Show company conversations
                      onOpenChange(false)
                    }}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        <Building className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{company.name}</div>
                        {company.industry && (
                          <div className="text-xs text-muted-foreground">
                            {company.industry}
                          </div>
                        )}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {results.conversations.length === 0 &&
             results.contacts.length === 0 &&
             results.companies.length === 0 && (
              <CommandEmpty>No results found</CommandEmpty>
            )}
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}

function getChannelIcon(channel: string) {
  switch (channel) {
    case 'email':
      return <Mail className="h-3 w-3" />
    case 'sms':
    case 'mms':
      return <MessageSquare className="h-3 w-3" />
    case 'voice':
    case 'voicemail':
      return <Phone className="h-3 w-3" />
    case 'whatsapp':
      return <MessageSquare className="h-3 w-3 text-green-500" />
    default:
      return <MessageSquare className="h-3 w-3" />
  }
}