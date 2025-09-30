# Codebase Documentation
## FieldLite CRM - Code Structure & Component Guide

**Last Updated:** 2025-09-29
**Version:** 1.0.0

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Directory Structure](#directory-structure)
4. [Key Files & Components](#key-files--components)
5. [Data Flow](#data-flow)
6. [API Routes](#api-routes)
7. [Database Tables](#database-tables)
8. [Common Patterns](#common-patterns)
9. [How to Find Things](#how-to-find-things)

---

## Project Overview

FieldLite CRM is a Next.js 15 application using TypeScript, Supabase for backend, Twilio for communications, and Stripe for payments. It's a multi-tenant SaaS platform for service-based businesses.

**Key Characteristics:**
- Server-side rendering with Next.js App Router
- Supabase for authentication, database, and realtime subscriptions
- Twilio integration for phone calls and SMS
- Modern UI with Radix UI components and Tailwind CSS
- Type-safe with TypeScript and Zod validation

---

## Tech Stack

### Frontend
- **Framework:** Next.js 15.5.3 (App Router)
- **Language:** TypeScript 5
- **UI Library:** React 19.1.0
- **Styling:** Tailwind CSS 4
- **Component Library:** Radix UI (headless components)
- **Icons:** Lucide React
- **State Management:** Zustand
- **Forms:** React Hook Form + Zod validation
- **Animations:** Framer Motion
- **Theme:** next-themes (light/dark mode)
- **Virtualization:** @tanstack/react-virtual (for large lists)

### Backend & Infrastructure
- **Database:** PostgreSQL (via Supabase)
- **Auth:** Supabase Auth
- **Backend:** Supabase (PostgreSQL + realtime)
- **Communications:** Twilio (Voice & SMS)
- **Payments:** Stripe
- **Hosting:** Vercel
- **Testing:** Playwright

### Development Tools
- **Package Manager:** npm
- **Linter:** ESLint
- **Build Tool:** Next.js with Turbopack
- **Database Migrations:** Supabase migrations

---

## Directory Structure

```
fieldlite-crm/
├── app/                          # Next.js App Router (routes & pages)
│   ├── api/                      # API routes
│   │   ├── calls/                # Call-related APIs
│   │   ├── encryption/           # Encryption health checks
│   │   ├── sms/                  # SMS APIs
│   │   ├── twilio/               # Twilio webhooks & integrations
│   │   │   ├── voice/            # Voice call handling
│   │   │   ├── sms/              # SMS handling
│   │   │   ├── webhook/          # Tenant-specific webhooks
│   │   │   └── settings/         # Twilio configuration
│   │   └── seed/                 # Database seeding endpoints
│   ├── auth/                     # Authentication pages
│   │   ├── login/
│   │   ├── signup/
│   │   └── callback/             # OAuth callback
│   ├── communications/           # Communication hub page
│   ├── dashboard/                # Main dashboard
│   ├── deals/                    # Deals management
│   ├── estimates/                # Estimates/quotes
│   ├── invoices/                 # Invoice management
│   ├── jobs/                     # Job scheduling & tracking
│   ├── products/                 # Product/service catalog
│   ├── reports/                  # Reporting & analytics
│   ├── settings/                 # App settings
│   │   └── twilio/               # Twilio-specific settings
│   ├── layout.tsx                # Root layout (theme provider, fonts)
│   └── page.tsx                  # Home/landing page
│
├── components/                   # React components
│   ├── communications/           # Communication-related components
│   │   └── hub/                  # Communication hub components
│   │       ├── CommunicationHub.tsx       # Main hub container
│   │       ├── ContactsView.tsx           # Contacts sidebar
│   │       ├── ConversationList.tsx       # List of conversations
│   │       ├── ConversationView.tsx       # Message thread view
│   │       ├── ConversationComposer.tsx   # Message composition
│   │       └── SearchCommand.tsx          # Search functionality
│   ├── dashboard/                # Dashboard components
│   │   ├── DashboardLayout.tsx   # Main app layout wrapper
│   │   └── DashboardStats.tsx    # Statistics cards
│   ├── jobs/                     # Job-related components
│   │   ├── AdvancedJobSearch.tsx # Job search with filters
│   │   └── VirtualizedJobList.tsx # Performance-optimized job list
│   ├── ui/                       # Reusable UI components (shadcn/ui)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── calendar.tsx
│   │   ├── popover.tsx
│   │   ├── slider.tsx
│   │   └── ...                   # Other Radix UI wrappers
│   ├── theme-provider.tsx        # Theme context provider
│   └── theme-toggle.tsx          # Light/dark mode toggle
│
├── lib/                          # Utility libraries & helpers
│   ├── supabase/                 # Supabase configuration
│   │   └── client.ts             # Supabase client initialization
│   ├── hooks/                    # Custom React hooks
│   └── utils.ts                  # Utility functions (cn, etc.)
│
├── stores/                       # Zustand state management
│   └── [store files]             # Global state stores
│
├── types/                        # TypeScript type definitions
│   └── [type files]              # Shared types and interfaces
│
├── supabase/                     # Supabase configuration & migrations
│   ├── migrations/               # Database migration files
│   │   ├── 00001_initial_schema.sql      # Core tables
│   │   ├── 00002_crm_features.sql        # CRM-specific tables
│   │   ├── 00003_job_management.sql      # Job tables
│   │   ├── 00004_communication.sql       # Communication tables
│   │   ├── 00005_financial.sql           # Financial tables
│   │   ├── 00006_utility_tables.sql      # Utility tables
│   │   └── README.md             # Migration documentation
│   ├── schema.sql                # Complete current schema
│   └── .temp/                    # Temporary migration files
│
├── scripts/                      # Utility scripts
│   ├── seed-messages-direct.js   # Seed sample data
│   └── extract-full-schema.sql   # Schema export queries
│
├── tests/                        # Playwright test files
│   └── [test files]
│
├── public/                       # Static assets
├── components.json               # shadcn/ui configuration
├── tailwind.config.ts            # Tailwind CSS configuration
├── tsconfig.json                 # TypeScript configuration
├── playwright.config.ts          # Playwright test configuration
├── package.json                  # Dependencies & scripts
└── vercel.json                   # Vercel deployment config
```

---

## Key Files & Components

### Core Application Files

#### [app/layout.tsx](./app/layout.tsx)
**Purpose:** Root layout for the entire application
**Key Features:**
- Theme provider for light/dark mode
- Font configuration (Inter)
- Global metadata and viewport settings
- Wraps all pages

**When to modify:**
- Adding global providers (auth, analytics, etc.)
- Changing default fonts or theme
- Adding global scripts or meta tags

---

#### [components/dashboard/DashboardLayout.tsx](./components/dashboard/DashboardLayout.tsx)
**Purpose:** Main application layout with sidebar navigation
**Key Features:**
- Sidebar navigation menu
- User authentication state
- Responsive mobile menu
- Navigation to all main app sections

**When to modify:**
- Adding new navigation items
- Changing sidebar layout or styling
- Adding global UI elements (notifications, etc.)

---

### Supabase & Database

#### [lib/supabase/client.ts](./lib/supabase/client.ts)
**Purpose:** Supabase client configuration and initialization
**Key Features:**
- Client-side Supabase instance
- Server-side Supabase instance (for API routes)
- Cookie-based authentication
- Type-safe database client

**When to modify:**
- Changing Supabase configuration
- Adding custom Supabase functions
- Modifying authentication behavior

**Usage Example:**
```typescript
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()
const { data, error } = await supabase
  .from('contacts')
  .select('*')
  .eq('tenant_id', tenantId)
```

---

#### [supabase/schema.sql](./supabase/schema.sql)
**Purpose:** Complete database schema definition
**Key Tables:**
- `tenants` - Multi-tenant isolation
- `user_profiles` - User information
- `contacts` - Customer contacts
- `companies` - Commercial accounts
- `jobs` - Service jobs
- `calls` - Call logs (Twilio)
- `sms_messages` - SMS communications
- `estimates` - Job quotes
- `invoices` - Billing
- `products` - Service catalog

**When to modify:**
- Adding new tables or columns
- Creating new migrations
- Updating RLS (Row Level Security) policies

---

### Communication System

#### [components/communications/hub/CommunicationHub.tsx](./components/communications/hub/CommunicationHub.tsx)
**Purpose:** Unified communication interface
**Key Features:**
- Split-pane layout
- Contacts list
- Conversation threading
- SMS and call integration
- Real-time updates via Supabase subscriptions

**Related Components:**
- `ContactsView.tsx` - Contact sidebar with search
- `ConversationList.tsx` - List of recent conversations
- `ConversationView.tsx` - Message thread display
- `ConversationComposer.tsx` - Send new messages
- `SearchCommand.tsx` - Quick search for contacts/conversations

**When to modify:**
- Adding new communication channels (email, etc.)
- Changing communication UI/UX
- Adding filters or sorting options

---

### Job Management

#### [app/jobs/page.tsx](./app/jobs/page.tsx)
**Purpose:** Job scheduling and management interface
**Key Features:**
- Job list with status filtering
- Create/edit job functionality
- Job assignment to staff
- Integration with estimates and invoices

**Related Components:**
- `AdvancedJobSearch.tsx` - Search and filter jobs
- `VirtualizedJobList.tsx` - Performance-optimized list for large datasets

**When to modify:**
- Adding job workflow features
- Changing job status logic
- Adding job templates or automation

---

### API Routes

#### Twilio Integration
**Base Path:** `/app/api/twilio/`

**Key Routes:**
- `voice/answer/route.ts` - Handle incoming calls
- `voice/outbound/route.ts` - Initiate outbound calls
- `voice/status/route.ts` - Call status webhooks
- `voice/recording/route.ts` - Call recording webhooks
- `sms/receive/route.ts` - Receive SMS messages
- `sms/send/route.ts` - Send SMS messages
- `sms/status/route.ts` - SMS delivery status
- `settings/route.ts` - Twilio configuration management
- `configure-webhooks/route.ts` - Auto-configure Twilio webhooks

**Webhook Pattern:**
- Tenant-specific webhooks: `/api/twilio/webhook/[tenantId]/voice/route.ts`
- Enables multi-tenant isolation for Twilio callbacks

---

#### Call Management
**Base Path:** `/app/api/calls/`

**Key Routes:**
- `initiate/route.ts` - Start a new call
- `recent/route.ts` - Fetch recent call history

---

#### Encryption & Health
**Base Path:** `/app/api/encryption/`

**Key Routes:**
- `health/route.ts` - Check encryption system status

---

## Data Flow

### Authentication Flow
```
1. User visits app → redirect to /auth/login
2. User logs in with email/password (Supabase Auth)
3. Supabase creates session cookie
4. Redirect to /dashboard
5. All subsequent requests include auth cookie
6. Server-side: validate session in middleware
7. Client-side: useUser() hook provides user data
```

### Job Creation Flow
```
1. User clicks "New Job" in /jobs
2. Job form modal opens
3. User selects contact (or creates new)
4. User fills in job details (type, date, notes)
5. Submit → POST to /api/jobs (or direct Supabase insert)
6. Server validates tenant_id and user permissions
7. Insert into jobs table
8. Redirect/refresh job list
9. Optional: Send SMS confirmation to customer
```

### Communication Flow (SMS)
```
Outbound SMS:
1. User types message in ConversationComposer
2. Click Send → POST /api/twilio/sms/send
3. Server validates tenant, retrieves encrypted Twilio credentials
4. Send via Twilio API
5. Store in sms_messages table (direction: outbound)
6. Return success/error to client

Inbound SMS:
1. Customer sends SMS to business number
2. Twilio receives message
3. Twilio webhook → POST /api/twilio/webhook/[tenantId]/sms
4. Server validates request signature
5. Store in sms_messages table (direction: inbound)
6. Realtime subscription triggers UI update in CommunicationHub
7. User sees new message in conversation thread
```

### Call Flow
```
Outbound Call:
1. User clicks call icon next to contact
2. POST /api/twilio/voice/outbound
3. Server initiates call via Twilio
4. Twilio connects caller → recipient
5. Call status updates via webhooks
6. Store call record in calls table

Inbound Call:
1. Customer calls business number
2. Twilio receives call
3. Twilio requests TwiML → GET /api/twilio/webhook/[tenantId]/voice
4. Server returns TwiML (forward to user's phone, voicemail, etc.)
5. Call status updates logged via webhooks
6. Store in calls table with recordings if enabled
```

---

## API Routes

### Complete API Route Reference

#### Authentication
- `GET /app/auth/callback/route.ts` - OAuth callback handler

#### Calls
- `POST /api/calls/initiate` - Initiate outbound call
- `GET /api/calls/recent` - Fetch recent calls

#### Encryption
- `GET /api/encryption/health` - Encryption system health check

#### SMS
- `POST /api/sms/send` - Send SMS message

#### Twilio
- `POST /api/twilio/voice/answer` - Handle incoming voice call
- `POST /api/twilio/voice/outbound` - Initiate outbound call
- `POST /api/twilio/voice/status` - Voice call status webhook
- `POST /api/twilio/voice/recording` - Recording ready webhook
- `POST /api/twilio/sms/receive` - Receive incoming SMS
- `POST /api/twilio/sms/send` - Send SMS via Twilio
- `POST /api/twilio/sms/status` - SMS delivery status webhook
- `GET/POST /api/twilio/settings` - Get/update Twilio configuration
- `POST /api/twilio/configure-webhooks` - Auto-configure Twilio webhooks
- `GET /api/twilio/webhook/urls` - Get current webhook URLs
- `POST /api/twilio/webhook/[tenantId]/voice` - Tenant-specific voice webhook
- `POST /api/twilio/webhook/[tenantId]/voice/outbound` - Tenant outbound call webhook
- `POST /api/twilio/webhook/[tenantId]/status` - Tenant call status webhook

#### Testing & Development
- `POST /api/seed/messages` - Seed sample message data
- `GET /api/health` - Application health check
- `POST /api/twilio/test` - Test Twilio connection
- `POST /api/twilio/webhook/test` - Test webhook configuration

---

## Database Tables

### Core Tables

#### tenants
**Purpose:** Multi-tenant isolation
**Key Columns:**
- `id` (UUID, primary key)
- `name` (text)
- `subdomain` (text, unique)
- `created_at` (timestamp)

---

#### user_profiles
**Purpose:** Extended user information
**Key Columns:**
- `id` (UUID, references auth.users)
- `tenant_id` (UUID, references tenants)
- `email` (text)
- `full_name` (text)
- `role` (text: admin, user, technician)
- `phone` (text)
- `avatar_url` (text)

---

#### contacts
**Purpose:** Customer and lead management
**Key Columns:**
- `id` (UUID, primary key)
- `tenant_id` (UUID, references tenants)
- `company_id` (UUID, references companies, nullable)
- `type` (contact_type enum: lead, customer, vendor, partner)
- `first_name` (text)
- `last_name` (text)
- `email` (text)
- `phone` (text)
- `mobile` (text)
- `address` (text)
- `city` (text)
- `state` (text)
- `zip` (text)
- `notes` (text)
- `tags` (text[])
- `source` (text: referral, website, ad, etc.)
- `created_at` (timestamp)
- `updated_at` (timestamp)

**Relationships:**
- One-to-many: contact → jobs
- One-to-many: contact → calls
- One-to-many: contact → sms_messages
- Many-to-one: contact → company

---

#### companies
**Purpose:** Commercial account management
**Key Columns:**
- `id` (UUID, primary key)
- `tenant_id` (UUID, references tenants)
- `name` (text)
- `industry` (text)
- `website` (text)
- `phone` (text)
- `address` (text)
- `city` (text)
- `state` (text)
- `zip` (text)
- `notes` (text)

**Relationships:**
- One-to-many: company → contacts
- One-to-many: company → jobs

---

#### jobs
**Purpose:** Service job scheduling and tracking
**Key Columns:**
- `id` (UUID, primary key)
- `tenant_id` (UUID, references tenants)
- `contact_id` (UUID, references contacts)
- `company_id` (UUID, references companies, nullable)
- `job_number` (text, auto-generated)
- `title` (text)
- `description` (text)
- `type` (job_type enum)
- `status` (job_status enum)
- `priority` (job_priority enum)
- `scheduled_date` (date)
- `scheduled_time` (time)
- `estimated_duration` (interval)
- `assigned_to` (UUID, references user_profiles)
- `address` (text)
- `city` (text)
- `state` (text)
- `zip` (text)
- `notes` (text)
- `created_by` (UUID, references user_profiles)
- `created_at` (timestamp)
- `updated_at` (timestamp)
- `completed_at` (timestamp, nullable)

**Relationships:**
- Many-to-one: job → contact
- Many-to-one: job → company
- Many-to-one: job → assigned_to (user)
- One-to-many: job → estimates
- One-to-many: job → invoices

---

#### calls
**Purpose:** Call logging and tracking
**Key Columns:**
- `id` (UUID, primary key)
- `tenant_id` (UUID, references tenants)
- `contact_id` (UUID, references contacts, nullable)
- `twilio_call_sid` (text, unique)
- `direction` (call_direction enum)
- `status` (call_status enum)
- `from_number` (text)
- `to_number` (text)
- `duration` (integer, seconds)
- `recording_url` (text, nullable)
- `notes` (text)
- `created_at` (timestamp)
- `answered_at` (timestamp, nullable)
- `ended_at` (timestamp, nullable)

**Relationships:**
- Many-to-one: call → contact

---

#### sms_messages
**Purpose:** SMS message storage and threading
**Key Columns:**
- `id` (UUID, primary key)
- `tenant_id` (UUID, references tenants)
- `contact_id` (UUID, references contacts, nullable)
- `twilio_message_sid` (text, unique)
- `direction` (text: inbound, outbound)
- `status` (text: queued, sent, delivered, failed, received)
- `from_number` (text)
- `to_number` (text)
- `body` (text)
- `media_urls` (text[], nullable)
- `error_code` (text, nullable)
- `error_message` (text, nullable)
- `created_at` (timestamp)
- `sent_at` (timestamp, nullable)
- `delivered_at` (timestamp, nullable)

**Relationships:**
- Many-to-one: sms_message → contact

---

#### estimates
**Purpose:** Job quotes and proposals
**Key Columns:**
- `id` (UUID, primary key)
- `tenant_id` (UUID, references tenants)
- `contact_id` (UUID, references contacts)
- `job_id` (UUID, references jobs, nullable)
- `estimate_number` (text, auto-generated)
- `status` (estimate_status enum)
- `issue_date` (date)
- `expiration_date` (date)
- `subtotal` (numeric)
- `tax_rate` (numeric)
- `tax_amount` (numeric)
- `discount_amount` (numeric)
- `total` (numeric)
- `notes` (text)
- `terms` (text)
- `created_by` (UUID, references user_profiles)
- `created_at` (timestamp)
- `updated_at` (timestamp)
- `accepted_at` (timestamp, nullable)

**Relationships:**
- Many-to-one: estimate → contact
- Many-to-one: estimate → job
- One-to-many: estimate → estimate_items

---

#### invoices
**Purpose:** Billing and payment tracking
**Key Columns:**
- `id` (UUID, primary key)
- `tenant_id` (UUID, references tenants)
- `contact_id` (UUID, references contacts)
- `job_id` (UUID, references jobs, nullable)
- `estimate_id` (UUID, references estimates, nullable)
- `invoice_number` (text, auto-generated)
- `status` (invoice_status enum)
- `issue_date` (date)
- `due_date` (date)
- `subtotal` (numeric)
- `tax_rate` (numeric)
- `tax_amount` (numeric)
- `discount_amount` (numeric)
- `total` (numeric)
- `amount_paid` (numeric)
- `balance_due` (numeric)
- `notes` (text)
- `terms` (text)
- `created_by` (UUID, references user_profiles)
- `created_at` (timestamp)
- `updated_at` (timestamp)
- `paid_at` (timestamp, nullable)

**Relationships:**
- Many-to-one: invoice → contact
- Many-to-one: invoice → job
- Many-to-one: invoice → estimate
- One-to-many: invoice → invoice_items
- One-to-many: invoice → payments

---

#### products
**Purpose:** Service and product catalog
**Key Columns:**
- `id` (UUID, primary key)
- `tenant_id` (UUID, references tenants)
- `name` (text)
- `description` (text)
- `sku` (text)
- `category` (text)
- `unit_price` (numeric)
- `cost` (numeric)
- `taxable` (boolean)
- `active` (boolean)
- `created_at` (timestamp)
- `updated_at` (timestamp)

**Usage:**
- Referenced in estimate_items and invoice_items

---

### Supporting Tables

- `estimate_items` - Line items for estimates
- `invoice_items` - Line items for invoices
- `payments` - Payment records
- `deals` - Sales pipeline management
- `activities` - Activity log for contacts
- `twilio_settings` - Encrypted Twilio credentials per tenant

---

## Common Patterns

### 1. Multi-Tenancy
**Every query must filter by tenant_id:**
```typescript
const { data, error } = await supabase
  .from('contacts')
  .select('*')
  .eq('tenant_id', user.tenant_id)
```

**Row Level Security (RLS) enforces this at the database level.**

---

### 2. Realtime Subscriptions
**Subscribe to database changes:**
```typescript
const subscription = supabase
  .channel('sms-messages')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'sms_messages',
      filter: `tenant_id=eq.${tenantId}`
    },
    (payload) => {
      console.log('New message:', payload.new)
      // Update UI
    }
  )
  .subscribe()

// Cleanup
return () => {
  subscription.unsubscribe()
}
```

---

### 3. Form Handling with React Hook Form + Zod
```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  first_name: z.string().min(1, 'First name required'),
  email: z.string().email('Invalid email'),
})

const form = useForm({
  resolver: zodResolver(schema),
  defaultValues: { first_name: '', email: '' }
})

const onSubmit = async (data) => {
  // Save to database
}

return <form onSubmit={form.handleSubmit(onSubmit)}>...</form>
```

---

### 4. API Route Pattern
```typescript
// app/api/example/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = createClient()

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get user's tenant_id
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  // Query data with tenant filter
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('tenant_id', profile.tenant_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}
```

---

### 5. Twilio Webhook Validation
```typescript
import twilio from 'twilio'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const params = Object.fromEntries(formData)

  // Get signature from header
  const signature = request.headers.get('x-twilio-signature')

  // Validate webhook signature
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const url = request.url

  const isValid = twilio.validateRequest(
    authToken,
    signature,
    url,
    params
  )

  if (!isValid) {
    return new Response('Forbidden', { status: 403 })
  }

  // Process webhook...
}
```

---

### 6. Encryption for Sensitive Data
**Twilio credentials are encrypted in the database:**
```typescript
// Encryption uses pgcrypto extension
// Stored in twilio_settings table with encrypted columns

// Example: Retrieving and decrypting
const { data } = await supabase
  .rpc('decrypt_twilio_credentials', { tenant_id: tenantId })

// Returns decrypted account_sid, auth_token, phone_number
```

---

## How to Find Things

### "I want to add a new page"
1. Create `app/[pagename]/page.tsx`
2. Add navigation link in `components/dashboard/DashboardLayout.tsx`
3. Add route to any relevant middleware

### "I want to add a new API endpoint"
1. Create `app/api/[endpoint]/route.ts`
2. Export `GET`, `POST`, `PUT`, `DELETE` as needed
3. Always validate tenant_id
4. Return NextResponse.json()

### "I want to add a new database table"
1. Create migration file: `supabase/migrations/[number]_[name].sql`
2. Add table with tenant_id column
3. Add RLS policies for tenant isolation
4. Update `supabase/schema.sql` with the new table
5. Document in this file ([codebase.md](./codebase.md))

### "I want to modify the communication system"
- Main hub: [components/communications/hub/CommunicationHub.tsx](./components/communications/hub/CommunicationHub.tsx)
- SMS sending: [app/api/twilio/sms/send/route.ts](./app/api/twilio/sms/send/route.ts)
- SMS receiving: [app/api/twilio/webhook/[tenantId]/sms/route.ts](./app/api/twilio/webhook/[tenantId]/sms/route.ts)
- Call handling: [app/api/twilio/voice/](./app/api/twilio/voice/)

### "I want to add a new UI component"
1. Check if it exists in `components/ui/` (shadcn)
2. If not, run: `npx shadcn@latest add [component]`
3. For custom components, add to relevant directory under `components/`

### "I want to add a new state store"
1. Create file in `stores/[name]Store.ts`
2. Use Zustand pattern:
```typescript
import { create } from 'zustand'

interface MyStore {
  count: number
  increment: () => void
}

export const useMyStore = create<MyStore>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 }))
}))
```

### "I want to understand the authentication flow"
1. Entry: [app/auth/login/page.tsx](./app/auth/login/page.tsx)
2. Callback: [app/auth/callback/route.ts](./app/auth/callback/route.ts)
3. Client config: [lib/supabase/client.ts](./lib/supabase/client.ts)
4. User context: Check for auth hooks in `lib/hooks/`

### "I want to see how Twilio is configured"
1. Settings UI: [app/settings/twilio/page.tsx](./app/settings/twilio/page.tsx)
2. Settings API: [app/api/twilio/settings/route.ts](./app/api/twilio/settings/route.ts)
3. Webhook config: [app/api/twilio/configure-webhooks/route.ts](./app/api/twilio/configure-webhooks/route.ts)
4. Database table: `twilio_settings` in schema

---

## Code Quality Guidelines

### 1. Always Use TypeScript
- No `any` types unless absolutely necessary
- Define interfaces for all data structures
- Use Zod for runtime validation

### 2. Component Structure
```typescript
// Imports
import { useState } from 'react'
import { Button } from '@/components/ui/button'

// Types
interface Props {
  title: string
  onSave: () => void
}

// Component
export function MyComponent({ title, onSave }: Props) {
  // Hooks
  const [count, setCount] = useState(0)

  // Handlers
  const handleClick = () => {
    setCount(count + 1)
    onSave()
  }

  // Render
  return (
    <div>
      <h1>{title}</h1>
      <Button onClick={handleClick}>Count: {count}</Button>
    </div>
  )
}
```

### 3. Error Handling
- Always handle errors from Supabase queries
- Show user-friendly error messages
- Log errors for debugging

### 4. Security
- Never trust client input
- Always validate tenant_id on server
- Use RLS policies in Supabase
- Validate webhook signatures
- Encrypt sensitive data (Twilio, Stripe keys)

---

## Testing

### Playwright Tests
**Location:** `tests/`
**Run:** `npm run test`
**UI Mode:** `npm run test:ui`

**Test Structure:**
```typescript
import { test, expect } from '@playwright/test'

test('user can create a job', async ({ page }) => {
  await page.goto('/jobs')
  await page.click('button:has-text("New Job")')
  await page.fill('input[name="title"]', 'Test Job')
  await page.click('button:has-text("Save")')
  await expect(page.locator('text=Test Job')).toBeVisible()
})
```

---

## Environment Variables

**Required in `.env.local`:**
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

TWILIO_ACCOUNT_SID=ACxxx...
TWILIO_AUTH_TOKEN=xxx...
TWILIO_PHONE_NUMBER=+1234567890

STRIPE_SECRET_KEY=sk_test_xxx...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx...

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Common Gotchas & Solutions

### 1. "Query returns nothing even though data exists"
**Cause:** Forgot to filter by `tenant_id`
**Solution:** Always include `.eq('tenant_id', user.tenant_id)`

### 2. "Realtime subscription not firing"
**Cause:** RLS policies block subscription
**Solution:** Ensure RLS policies allow SELECT for the user's tenant

### 3. "Twilio webhook returns 403"
**Cause:** Invalid signature validation
**Solution:** Ensure webhook URL matches exactly (http vs https, trailing slash, etc.)

### 4. "Authentication redirects in a loop"
**Cause:** Missing or invalid session cookie
**Solution:** Check Supabase client configuration and cookie settings

### 5. "Type errors with Supabase queries"
**Cause:** Schema changes not reflected in types
**Solution:** Regenerate types: `npx supabase gen types typescript --project-id <project-id> > types/supabase.ts`

---

## Next Steps for New Developers

1. **Set up local environment:**
   - Clone repo
   - Copy `.env.local.example` to `.env.local`
   - Fill in Supabase credentials
   - Run `npm install`
   - Run `npm run dev`

2. **Explore the codebase:**
   - Start with [plan.md](./plan.md) for project overview
   - Read [PRD.md](./PRD.md) for product vision
   - Review [architecture.md](./architecture.md) for technical decisions

3. **Make your first change:**
   - Pick a small task from Current Sprint in plan.md
   - Create a feature branch
   - Make changes
   - Test locally
   - Update documentation if needed
   - Create PR

4. **Get familiar with key areas:**
   - Run the app and click through all pages
   - Try creating a contact, job, and sending an SMS
   - Look at the database in Supabase dashboard
   - Review recent commit history

---

## Documentation Maintenance

**When you make changes, update this file if you:**
- Add a new page or major component
- Add a new API route
- Change the database schema
- Add a new integration or external service
- Refactor a significant part of the codebase

**Quick update checklist:**
- [ ] Update relevant section in this file
- [ ] Update [plan.md](./plan.md) if it affects the roadmap
- [ ] Update [architecture.md](./architecture.md) if it's an architectural change
- [ ] Add note to [CHANGELOG-REMINDER.md](./CHANGELOG-REMINDER.md)
- [ ] Update "Last Updated" date at the top

---

**Questions or issues with this documentation?**
Create an issue or update this file directly!