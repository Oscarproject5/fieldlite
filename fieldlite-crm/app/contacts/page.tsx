'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { ClickToCall } from '@/components/twilio/click-to-call'
import { CallHistory } from '@/components/twilio/call-history'
import {
  Users,
  Search,
  Plus,
  Mail,
  Phone,
  Building,
  MapPin,
  User,
  Filter,
  ChevronRight,
  Edit,
  Trash,
  Calendar,
  DollarSign,
  MessageSquare,
  FileText,
  Tag,
  Clock,
  PhoneCall,
  X,
  Check
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert'
import { formatDistanceToNow, format } from 'date-fns'

interface Contact {
  id: string
  tenant_id?: string
  first_name: string
  last_name: string
  email: string
  phones: string[]
  company: string
  type: 'lead' | 'customer' | 'vendor'
  address: any
  notes?: string
  tags?: string[]
  created_at: string
  updated_at?: string
  user_id?: string
  last_contacted?: string
  source?: string
  status?: string
}

interface ContactNote {
  id: string
  contact_id: string
  content: string
  created_at: string
  created_by?: string
}

interface ContactActivity {
  id: string
  contact_id: string
  type: 'call' | 'email' | 'meeting' | 'note' | 'deal' | 'invoice'
  description: string
  created_at: string
  metadata?: any
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [showContactDetails, setShowContactDetails] = useState(false)
  const [showContactForm, setShowContactForm] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [formData, setFormData] = useState<Partial<Contact>>({
    first_name: '',
    last_name: '',
    email: '',
    phones: [''],
    company: '',
    type: 'lead',
    address: {},
    notes: '',
    tags: [],
    source: '',
    status: 'new'
  })
  const [contactNotes, setContactNotes] = useState<ContactNote[]>([])
  const [contactActivities, setContactActivities] = useState<ContactActivity[]>([])
  const [newNote, setNewNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    loadContacts()
  }, [])

  const loadContacts = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading contacts:', error)
        setError('Failed to load contacts')
      } else {
        setContacts(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
      setError('An error occurred while loading contacts')
    } finally {
      setLoading(false)
    }
  }

  const loadContactDetails = async (contactId: string) => {
    try {
      // Load contact notes
      const { data: notes } = await supabase
        .from('contact_notes')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false })

      if (notes) setContactNotes(notes)

      // Load contact activities (calls, deals, invoices, etc.)
      const activities: ContactActivity[] = []

      // Load calls
      const { data: calls } = await supabase
        .from('calls')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (calls) {
        calls.forEach(call => {
          activities.push({
            id: call.id,
            contact_id: contactId,
            type: 'call',
            description: `${call.direction === 'inbound' ? 'Received call from' : 'Made call to'} ${call.direction === 'inbound' ? call.from_number : call.to_number}`,
            created_at: call.created_at,
            metadata: call
          })
        })
      }

      // Load deals
      const { data: deals } = await supabase
        .from('deals')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (deals) {
        deals.forEach(deal => {
          activities.push({
            id: deal.id,
            contact_id: contactId,
            type: 'deal',
            description: `Deal created: ${deal.name} - $${deal.value}`,
            created_at: deal.created_at,
            metadata: deal
          })
        })
      }

      // Sort activities by date
      activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setContactActivities(activities)
    } catch (error) {
      console.error('Error loading contact details:', error)
    }
  }

  const saveContact = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('You must be logged in to save contacts')
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, tenant_id')
        .eq('id', user.id)
        .single()

      if (profileError || !profile) {
        console.error('Error loading profile:', profileError)
        setError('Failed to load user profile')
        return
      }

      if (!profile.tenant_id) {
        setError('No tenant associated with your profile. Please contact an administrator.')
        return
      }

      const contactData = {
        ...formData,
        tenant_id: profile.tenant_id,
        user_id: user.id,
        updated_at: new Date().toISOString()
      }

      if (editingContact) {
        // Update existing contact
        const { error } = await supabase
          .from('contacts')
          .update(contactData)
          .eq('id', editingContact.id)

        if (error) throw error
        setSuccess('Contact updated successfully')
      } else {
        // Create new contact
        const { error } = await supabase
          .from('contacts')
          .insert([contactData])

        if (error) throw error
        setSuccess('Contact created successfully')
      }

      await loadContacts()
      setTimeout(() => {
        setShowContactForm(false)
        resetForm()
      }, 1500)
    } catch (error: any) {
      console.error('Error saving contact:', error)
      setError(error.message || 'Failed to save contact')
    } finally {
      setSaving(false)
    }
  }

  const deleteContact = async (contactId: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return

    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId)

      if (error) throw error

      setSuccess('Contact deleted successfully')
      await loadContacts()
      setShowContactDetails(false)
    } catch (error: any) {
      console.error('Error deleting contact:', error)
      setError(error.message || 'Failed to delete contact')
    }
  }

  const saveNote = async () => {
    if (!newNote.trim() || !selectedContact) return

    setSavingNote(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('contact_notes')
        .insert([{
          contact_id: selectedContact.id,
          content: newNote,
          created_by: user.id
        }])

      if (error) throw error

      setNewNote('')
      await loadContactDetails(selectedContact.id)
    } catch (error) {
      console.error('Error saving note:', error)
      setError('Failed to save note')
    } finally {
      setSavingNote(false)
    }
  }

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phones: [''],
      company: '',
      type: 'lead',
      address: {},
      notes: '',
      tags: [],
      source: '',
      status: 'new'
    })
    setEditingContact(null)
    setError(null)
    setSuccess(null)
  }

  const openEditForm = (contact: Contact) => {
    setEditingContact(contact)
    setFormData(contact)
    setShowContactForm(true)
    setShowContactDetails(false)
  }

  const openContactDetails = async (contact: Contact) => {
    setSelectedContact(contact)
    setShowContactDetails(true)
    await loadContactDetails(contact.id)
  }

  const filteredContacts = contacts.filter(contact => {
    const fullName = `${contact.first_name} ${contact.last_name}`.toLowerCase()
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch = fullName.includes(searchLower) ||
      contact.email?.toLowerCase().includes(searchLower) ||
      contact.company?.toLowerCase().includes(searchLower) ||
      contact.phones?.some(phone => phone.includes(searchLower))

    const matchesType = filterType === 'all' || contact.type === filterType
    const matchesStatus = filterStatus === 'all' || contact.status === filterStatus

    return matchesSearch && matchesType && matchesStatus
  })

  const contactStats = {
    total: contacts.length,
    leads: contacts.filter(c => c.type === 'lead').length,
    customers: contacts.filter(c => c.type === 'customer').length,
    vendors: contacts.filter(c => c.type === 'vendor').length
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'lead': return 'default'
      case 'customer': return 'success'
      case 'vendor': return 'secondary'
      default: return 'default'
    }
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Users className="h-8 w-8" />
              Contacts
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage your leads, customers, and vendors
            </p>
          </div>
          <Button onClick={() => {
            resetForm()
            setShowContactForm(true)
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Contact
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{contactStats.total}</div>
              <p className="text-xs text-muted-foreground">All contacts in database</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Leads</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{contactStats.leads}</div>
              <p className="text-xs text-muted-foreground">Potential customers</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Customers</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{contactStats.customers}</div>
              <p className="text-xs text-muted-foreground">Active customers</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vendors</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{contactStats.vendors}</div>
              <p className="text-xs text-muted-foreground">Service providers</p>
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
                  placeholder="Search by name, email, phone, or company..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="lead">Leads</SelectItem>
                  <SelectItem value="customer">Customers</SelectItem>
                  <SelectItem value="vendor">Vendors</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

      {loading ? (
        <div className="text-center py-8">Loading contacts...</div>
      ) : filteredContacts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">No contacts found</p>
            <Button className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Contact
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredContacts.map((contact) => (
            <Card
              key={contact.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => openContactDetails(contact)}
            >
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <User className="h-6 w-6 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">
                        {contact.first_name} {contact.last_name}
                      </h3>
                      <Badge variant={getTypeColor(contact.type) as any}>
                        {contact.type}
                      </Badge>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>

                <div className="space-y-2">
                  {contact.company && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Building className="h-4 w-4" />
                      <span>{contact.company}</span>
                    </div>
                  )}
                  {contact.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="h-4 w-4" />
                      <span className="truncate">{contact.email}</span>
                    </div>
                  )}
                  {contact.phones && contact.phones[0] && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="h-4 w-4" />
                        <span>{contact.phones[0]}</span>
                      </div>
                      <ClickToCall
                        phoneNumber={contact.phones[0]}
                        contactId={contact.id}
                        size="icon"
                        variant="ghost"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

        {/* Contact Details Dialog */}
        <Dialog open={showContactDetails} onOpenChange={setShowContactDetails}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex justify-between items-start">
                <div>
                  <DialogTitle className="text-2xl">
                    {selectedContact?.first_name} {selectedContact?.last_name}
                  </DialogTitle>
                  <DialogDescription>
                    {selectedContact?.company && (
                      <span className="flex items-center gap-2 mt-2">
                        <Building className="h-4 w-4" />
                        {selectedContact.company}
                      </span>
                    )}
                  </DialogDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => selectedContact && openEditForm(selectedContact)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => selectedContact && deleteContact(selectedContact.id)}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </DialogHeader>

            {selectedContact && (
              <Tabs defaultValue="overview" className="mt-6">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                  <TabsTrigger value="calls">Calls</TabsTrigger>
                  <TabsTrigger value="notes">Notes</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Contact Information</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm text-muted-foreground">Type</Label>
                          <div className="mt-1">
                            <Badge variant={getTypeColor(selectedContact.type) as any}>
                              {selectedContact.type}
                            </Badge>
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Status</Label>
                          <div className="mt-1">
                            <Badge variant="outline">
                              {selectedContact.status || 'Active'}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {selectedContact.email && (
                        <div>
                          <Label className="text-sm text-muted-foreground">Email</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <Mail className="h-4 w-4" />
                            <span>{selectedContact.email}</span>
                          </div>
                        </div>
                      )}

                      {selectedContact.phones?.map((phone, index) => (
                        <div key={index}>
                          <Label className="text-sm text-muted-foreground">Phone {index + 1}</Label>
                          <div className="flex items-center justify-between mt-1">
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4" />
                              <span>{phone}</span>
                            </div>
                            <ClickToCall
                              phoneNumber={phone}
                              contactId={selectedContact.id}
                              size="sm"
                              variant="outline"
                              label="Call"
                            />
                          </div>
                        </div>
                      ))}

                      {selectedContact.address && Object.keys(selectedContact.address).length > 0 && (
                        <div>
                          <Label className="text-sm text-muted-foreground">Address</Label>
                          <div className="flex items-start gap-2 mt-1">
                            <MapPin className="h-4 w-4 mt-1" />
                            <div>
                              {selectedContact.address.street && <div>{selectedContact.address.street}</div>}
                              {(selectedContact.address.city || selectedContact.address.state || selectedContact.address.zip) && (
                                <div>
                                  {selectedContact.address.city && selectedContact.address.city}
                                  {selectedContact.address.state && `, ${selectedContact.address.state}`}
                                  {selectedContact.address.zip && ` ${selectedContact.address.zip}`}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {selectedContact.source && (
                        <div>
                          <Label className="text-sm text-muted-foreground">Source</Label>
                          <div className="mt-1">{selectedContact.source}</div>
                        </div>
                      )}

                      {selectedContact.notes && (
                        <div>
                          <Label className="text-sm text-muted-foreground">Notes</Label>
                          <div className="mt-1 p-3 bg-muted rounded-md">{selectedContact.notes}</div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        <div>
                          <Label className="text-sm text-muted-foreground">Created</Label>
                          <div className="mt-1 text-sm">
                            {format(new Date(selectedContact.created_at), 'PPP')}
                          </div>
                        </div>
                        {selectedContact.last_contacted && (
                          <div>
                            <Label className="text-sm text-muted-foreground">Last Contacted</Label>
                            <div className="mt-1 text-sm">
                              {formatDistanceToNow(new Date(selectedContact.last_contacted), { addSuffix: true })}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="activity" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {contactActivities.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          No activity yet
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {contactActivities.map((activity) => (
                            <div key={activity.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
                              <div className="mt-1">
                                {activity.type === 'call' && <PhoneCall className="h-4 w-4" />}
                                {activity.type === 'deal' && <DollarSign className="h-4 w-4" />}
                                {activity.type === 'invoice' && <FileText className="h-4 w-4" />}
                                {activity.type === 'note' && <MessageSquare className="h-4 w-4" />}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm">{activity.description}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="calls" className="space-y-4">
                  <CallHistory contactId={selectedContact.id} />
                </TabsContent>

                <TabsContent value="notes" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Notes</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex gap-2">
                        <Textarea
                          placeholder="Add a note..."
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          onClick={saveNote}
                          disabled={!newNote.trim() || savingNote}
                        >
                          {savingNote ? 'Saving...' : 'Add Note'}
                        </Button>
                      </div>

                      {contactNotes.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          No notes yet
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {contactNotes.map((note) => (
                            <div key={note.id} className="p-3 bg-muted rounded-md">
                              <p className="text-sm">{note.content}</p>
                              <p className="text-xs text-muted-foreground mt-2">
                                {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>

        {/* Add/Edit Contact Dialog */}
        <Dialog open={showContactForm} onOpenChange={setShowContactForm}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingContact ? 'Edit Contact' : 'Add New Contact'}
              </DialogTitle>
              <DialogDescription>
                {editingContact ? 'Update contact information' : 'Enter contact details'}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert>
                  <Check className="h-4 w-4" />
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name || ''}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    placeholder="John"
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name || ''}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <Label>Phone Numbers</Label>
                {formData.phones?.map((phone, index) => (
                  <div key={index} className="flex gap-2 mt-2">
                    <Input
                      value={phone}
                      onChange={(e) => {
                        const newPhones = [...(formData.phones || [])]
                        newPhones[index] = e.target.value
                        setFormData({ ...formData, phones: newPhones })
                      }}
                      placeholder="(555) 123-4567"
                    />
                    {formData.phones && formData.phones.length > 1 && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          const newPhones = formData.phones?.filter((_, i) => i !== index)
                          setFormData({ ...formData, phones: newPhones })
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => setFormData({ ...formData, phones: [...(formData.phones || []), ''] })}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Phone
                </Button>
              </div>

              <div>
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={formData.company || ''}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="Acme Inc."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lead">Lead</SelectItem>
                      <SelectItem value="customer">Customer</SelectItem>
                      <SelectItem value="vendor">Vendor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status || 'new'}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="source">Source</Label>
                <Select
                  value={formData.source || ''}
                  onValueChange={(value) => setFormData({ ...formData, source: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="social_media">Social Media</SelectItem>
                    <SelectItem value="cold_call">Cold Call</SelectItem>
                    <SelectItem value="advertisement">Advertisement</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes about this contact..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowContactForm(false)
                  resetForm()
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={saveContact}
                disabled={saving || !formData.first_name || !formData.last_name}
              >
                {saving ? 'Saving...' : (editingContact ? 'Update' : 'Create')} Contact
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}



