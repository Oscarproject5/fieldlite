'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Contact, Company, Deal } from '@/types/communications'
import {
  Search, Plus, Filter, Download, Upload, Mail, Phone, Building,
  User, Users, Star, Tag, Calendar, DollarSign, TrendingUp,
  MessageSquare, MoreHorizontal, Edit, Trash2, ExternalLink
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface ContactsViewProps {
  onContactSelect?: (contact: Contact) => void
  onStartConversation?: (contact: Contact, channel: string) => void
}

export function ContactsView({ onContactSelect, onStartConversation }: ContactsViewProps) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTier, setFilterTier] = useState<string>('all')
  const [filterTag, setFilterTag] = useState<string>('all')
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newContact, setNewContact] = useState<Partial<Contact>>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company: '',
  })

  const supabase = createClient()

  useEffect(() => {
    loadContacts()
    loadCompanies()
  }, [])

  const loadContacts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

      if (!profile?.tenant_id) return

      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .order('created_at', { ascending: false })

      if (error) {
        console.warn('Contacts table may not exist yet. Please run the migration.', error)
        setContacts([])
        return
      }

      setContacts(data || [])
    } catch (error) {
      console.error('Error loading contacts:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCompanies = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('tenant_id', profile.tenant_id)

      if (error) throw error
      setCompanies(data || [])
    } catch (error) {
      console.error('Error loading companies:', error)
    }
  }

  const createContact = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

      const { data, error } = await supabase
        .from('contacts')
        .insert({
          ...newContact,
          tenant_id: profile?.tenant_id,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error

      setContacts([data, ...contacts])
      setShowCreateDialog(false)
      setNewContact({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        company: '',
      })
    } catch (error) {
      console.error('Error creating contact:', error)
    }
  }

  const deleteContact = async (id: string) => {
    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id)

      if (error) throw error
      setContacts(contacts.filter(c => c.id !== id))
    } catch (error) {
      console.error('Error deleting contact:', error)
    }
  }

  // Filter contacts
  const filteredContacts = useMemo(() => {
    let filtered = contacts

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(contact =>
        contact.first_name?.toLowerCase().includes(query) ||
        contact.last_name?.toLowerCase().includes(query) ||
        contact.email?.toLowerCase().includes(query) ||
        contact.phone?.includes(query) ||
        contact.company?.toLowerCase().includes(query)
      )
    }

    // Tier filter
    if (filterTier !== 'all') {
      filtered = filtered.filter(contact => contact.tier === filterTier)
    }

    // Tag filter
    if (filterTag !== 'all') {
      filtered = filtered.filter(contact => contact.tags?.includes(filterTag))
    }

    return filtered
  }, [contacts, searchQuery, filterTier, filterTag])

  // Get unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>()
    contacts.forEach(contact => {
      contact.tags?.forEach(tag => tags.add(tag))
    })
    return Array.from(tags)
  }, [contacts])

  // Stats
  const stats = useMemo(() => ({
    total: contacts.length,
    new: contacts.filter(c => {
      const created = new Date(c.created_at)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return created > weekAgo
    }).length,
    vip: contacts.filter(c => c.tier === 'vip').length,
    withDeals: contacts.filter(c => c.deals && c.deals.length > 0).length,
  }), [contacts])

  const handleBulkAction = (action: string) => {
    console.log(`Bulk ${action} for`, Array.from(selectedContacts))
    setSelectedContacts(new Set())
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading contacts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">Contacts</h2>
            <p className="text-sm text-muted-foreground">
              Manage your contacts and leads in one place
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Contact
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Contact</DialogTitle>
                  <DialogDescription>
                    Add a new contact to your CRM
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>First Name</Label>
                      <Input
                        value={newContact.first_name || ''}
                        onChange={(e) => setNewContact({ ...newContact, first_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Last Name</Label>
                      <Input
                        value={newContact.last_name || ''}
                        onChange={(e) => setNewContact({ ...newContact, last_name: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={newContact.email || ''}
                      onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={newContact.phone || ''}
                      onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Company</Label>
                    <Input
                      value={newContact.company || ''}
                      onChange={(e) => setNewContact({ ...newContact, company: e.target.value })}
                    />
                  </div>
                  <Button onClick={createContact} className="w-full">
                    Create Contact
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total Contacts</div>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold">{stats.new}</div>
            <div className="text-xs text-muted-foreground">New This Week</div>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold">{stats.vip}</div>
            <div className="text-xs text-muted-foreground">VIP Contacts</div>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold">{stats.withDeals}</div>
            <div className="text-xs text-muted-foreground">With Active Deals</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterTier} onValueChange={setFilterTier}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Tiers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers</SelectItem>
              <SelectItem value="vip">VIP</SelectItem>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="basic">Basic</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterTag} onValueChange={setFilterTag}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Tags" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tags</SelectItem>
              {allTags.map(tag => (
                <SelectItem key={tag} value={tag}>{tag}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
          >
            {viewMode === 'list' ? <Users className="h-4 w-4" /> : <User className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedContacts.size > 0 && (
        <div className="px-6 py-2 bg-muted/50 border-b flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {selectedContacts.size} selected
          </span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => handleBulkAction('email')}>
              Send Email
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleBulkAction('tag')}>
              Add Tag
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleBulkAction('delete')}>
              Delete
            </Button>
          </div>
        </div>
      )}

      {/* Contacts List/Grid */}
      <div className="flex-1 overflow-auto p-6">
        {filteredContacts.length === 0 ? (
          <div className="text-center py-12">
            <User className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-lg font-medium mb-1">No contacts found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery ? 'Try adjusting your search' : 'Add your first contact to get started'}
            </p>
            {!searchQuery && (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Contact
              </Button>
            )}
          </div>
        ) : viewMode === 'list' ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30px]">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedContacts(new Set(filteredContacts.map(c => c.id)))
                      } else {
                        setSelectedContacts(new Set())
                      }
                    }}
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Last Contact</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContacts.map((contact) => (
                <TableRow
                  key={contact.id}
                  className="cursor-pointer"
                  onClick={() => onContactSelect?.(contact)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedContacts.has(contact.id)}
                      onChange={(e) => {
                        const newSelected = new Set(selectedContacts)
                        if (e.target.checked) {
                          newSelected.add(contact.id)
                        } else {
                          newSelected.delete(contact.id)
                        }
                        setSelectedContacts(newSelected)
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        {contact.avatar_url ? (
                          <AvatarImage src={contact.avatar_url} />
                        ) : (
                          <AvatarFallback>
                            {contact.first_name?.[0]}{contact.last_name?.[0]}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div>
                        <div className="font-medium">
                          {contact.first_name} {contact.last_name}
                        </div>
                        {contact.lifecycle_stage && (
                          <div className="text-xs text-muted-foreground">
                            {contact.lifecycle_stage}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {contact.email && (
                      <a
                        href={`mailto:${contact.email}`}
                        className="text-blue-600 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {contact.email}
                      </a>
                    )}
                  </TableCell>
                  <TableCell>
                    {contact.phone && (
                      <a
                        href={`tel:${contact.phone}`}
                        className="text-blue-600 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {contact.phone}
                      </a>
                    )}
                  </TableCell>
                  <TableCell>{contact.company}</TableCell>
                  <TableCell>
                    {contact.tier && (
                      <Badge variant={contact.tier === 'vip' ? 'default' : 'secondary'}>
                        {contact.tier}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {contact.tags?.slice(0, 2).map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {contact.tags && contact.tags.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{contact.tags.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {contact.last_contacted || '-'}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onStartConversation?.(contact, 'email')}>
                          <Mail className="h-4 w-4 mr-2" />
                          Send Email
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onStartConversation?.(contact, 'sms')}>
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Send SMS
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onStartConversation?.(contact, 'call')}>
                          <Phone className="h-4 w-4 mr-2" />
                          Call
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => deleteContact(contact.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredContacts.map((contact) => (
              <div
                key={contact.id}
                className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => onContactSelect?.(contact)}
              >
                <div className="flex items-start justify-between mb-3">
                  <Avatar className="h-12 w-12">
                    {contact.avatar_url ? (
                      <AvatarImage src={contact.avatar_url} />
                    ) : (
                      <AvatarFallback>
                        {contact.first_name?.[0]}{contact.last_name?.[0]}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  {contact.tier === 'vip' && (
                    <Star className="h-4 w-4 text-yellow-500" />
                  )}
                </div>
                <div className="space-y-1">
                  <div className="font-medium">
                    {contact.first_name} {contact.last_name}
                  </div>
                  {contact.company && (
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <Building className="h-3 w-3" />
                      {contact.company}
                    </div>
                  )}
                  {contact.email && (
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {contact.email}
                    </div>
                  )}
                  {contact.phone && (
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {contact.phone}
                    </div>
                  )}
                </div>
                <div className="mt-3 flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation()
                      onStartConversation?.(contact, 'email')
                    }}
                  >
                    <Mail className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation()
                      onStartConversation?.(contact, 'sms')
                    }}
                  >
                    <MessageSquare className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation()
                      onStartConversation?.(contact, 'call')
                    }}
                  >
                    <Phone className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}