# Technical Architecture Documentation
## FieldLite CRM - System Design & Architecture Decisions

**Last Updated:** 2025-09-29
**Version:** 1.0.0

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [System Architecture](#system-architecture)
3. [Design Principles](#design-principles)
4. [Technology Choices](#technology-choices)
5. [Data Architecture](#data-architecture)
6. [Security Architecture](#security-architecture)
7. [Communication Architecture](#communication-architecture)
8. [Scalability Strategy](#scalability-strategy)
9. [Design Decisions Log](#design-decisions-log)
10. [Future Architecture Considerations](#future-architecture-considerations)

---

## Architecture Overview

FieldLite CRM is built as a **modern, cloud-native, multi-tenant SaaS application** optimized for service-based businesses. The architecture prioritizes:

- **Developer velocity** - Fast iteration with modern frameworks
- **User experience** - Responsive, real-time updates, intuitive UI
- **Scalability** - Support growth from 10 to 10,000+ customers
- **Security** - Multi-tenant isolation, encrypted credentials, secure communications
- **Cost efficiency** - Serverless where appropriate, managed services
- **Maintainability** - Clear separation of concerns, documented patterns

---

## System Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Web Browser │  │ Mobile (PWA) │  │ Twilio Voice │          │
│  │   (React)    │  │   (React)    │  │   Webhooks   │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          ├──────────────────┴──────────────────┘
          │
┌─────────▼─────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                           │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │          Next.js 15 (App Router + Server Actions)        │ │
│  │                                                           │ │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐        │ │
│  │  │   Pages    │  │    API     │  │   Server   │        │ │
│  │  │ (React 19) │  │   Routes   │  │  Components│        │ │
│  │  └────────────┘  └────────────┘  └────────────┘        │ │
│  │                                                           │ │
│  │  ┌─────────────────────────────────────────────────┐    │ │
│  │  │  State Management (Zustand)                     │    │ │
│  │  └─────────────────────────────────────────────────┘    │ │
│  └──────────────────────────────────────────────────────────┘ │
└───────┬────────────────────────────────────────────┬──────────┘
        │                                            │
        │                                            │
┌───────▼────────────────────┐          ┌───────────▼────────────┐
│    SUPABASE LAYER          │          │  EXTERNAL SERVICES     │
│  ┌──────────────────────┐  │          │  ┌──────────────────┐ │
│  │  PostgreSQL + RLS    │  │          │  │  Twilio (Voice   │ │
│  │  (Multi-tenant DB)   │  │          │  │  & SMS)          │ │
│  └──────────────────────┘  │          │  └──────────────────┘ │
│  ┌──────────────────────┐  │          │  ┌──────────────────┐ │
│  │  Supabase Auth       │  │          │  │  Stripe          │ │
│  └──────────────────────┘  │          │  │  (Payments)      │ │
│  ┌──────────────────────┐  │          │  └──────────────────┘ │
│  │  Realtime Engine     │  │          │  ┌──────────────────┐ │
│  │  (WebSockets)        │  │          │  │  Vercel          │ │
│  └──────────────────────┘  │          │  │  (Hosting/CDN)   │ │
│  ┌──────────────────────┐  │          │  └──────────────────┘ │
│  │  Storage (Files)     │  │          └────────────────────────┘
│  └──────────────────────┘  │
└────────────────────────────┘
```

---

## Design Principles

### 1. Multi-Tenancy First
**Every feature is designed with tenant isolation in mind.**

- All database tables include `tenant_id`
- Row Level Security (RLS) enforces data boundaries
- Webhooks are tenant-specific
- No shared state between tenants

**Example:**
```sql
-- Every query automatically filtered by RLS
CREATE POLICY "Users can only access their tenant's data"
ON contacts FOR ALL
USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

---

### 2. Real-Time by Default
**Users expect instant updates in a modern application.**

- Supabase Realtime for database changes
- WebSocket subscriptions for messaging
- Optimistic UI updates for better UX
- Automatic reconnection handling

**Example:**
```typescript
// Real-time SMS subscription
const subscription = supabase
  .channel('sms-changes')
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'sms_messages' },
    (payload) => updateUI(payload.new)
  )
  .subscribe()
```

---

### 3. Security in Depth
**Never trust the client, always verify on the server.**

- Server-side authentication checks
- Database-level RLS policies
- Encrypted sensitive data (Twilio credentials)
- Webhook signature validation
- HTTPS everywhere

---

### 4. Progressive Enhancement
**Start with a functional baseline, enhance with JavaScript.**

- Server-side rendering (SSR) for initial page load
- Client-side hydration for interactivity
- Works without JavaScript for critical flows
- Mobile-first responsive design

---

### 5. Developer Experience Matters
**Fast iteration = better product.**

- TypeScript for type safety
- Hot module replacement in development
- Clear error messages and logging
- Consistent code patterns
- Comprehensive documentation

---

## Technology Choices

### Frontend Framework: Next.js 15 (App Router)

**Why Next.js?**
- ✅ Best-in-class React framework
- ✅ Server-side rendering (SSR) for performance and SEO
- ✅ App Router with React Server Components
- ✅ API routes built-in (no separate backend needed)
- ✅ Excellent developer experience with Turbopack
- ✅ Vercel deployment with zero configuration
- ✅ Strong TypeScript support

**Alternatives Considered:**
- ❌ Create React App - No SSR, no built-in API routes, deprecated
- ❌ Remix - Great but smaller ecosystem, less mature
- ❌ Vite + React - Requires more manual setup, no SSR out of the box

---

### Backend: Supabase (PostgreSQL + Auth + Realtime)

**Why Supabase?**
- ✅ PostgreSQL (battle-tested, powerful, familiar)
- ✅ Built-in authentication (email, OAuth, magic links)
- ✅ Row Level Security for multi-tenancy
- ✅ Realtime subscriptions via WebSockets
- ✅ RESTful API auto-generated from schema
- ✅ Generous free tier, transparent pricing
- ✅ Self-hostable if needed (no vendor lock-in)
- ✅ Excellent TypeScript support

**Alternatives Considered:**
- ❌ Firebase - NoSQL not ideal for relational CRM data, vendor lock-in
- ❌ AWS Amplify - Complex setup, AWS ecosystem lock-in
- ❌ Custom Node.js + PostgreSQL - Much more infrastructure to manage
- ❌ Prisma + custom auth - More code to write and maintain

---

### State Management: Zustand

**Why Zustand?**
- ✅ Minimal boilerplate (compared to Redux)
- ✅ TypeScript-first design
- ✅ No context provider wrapper needed
- ✅ Excellent performance
- ✅ Simple, readable code
- ✅ Works great with React Server Components

**Alternatives Considered:**
- ❌ Redux - Too much boilerplate for our needs
- ❌ React Context - Performance issues with frequent updates
- ❌ Jotai/Recoil - More complex API, smaller community

---

### UI Components: Radix UI + Tailwind CSS

**Why Radix UI?**
- ✅ Unstyled, accessible components
- ✅ Full keyboard navigation support
- ✅ ARIA attributes handled automatically
- ✅ Customizable with Tailwind
- ✅ No design opinions imposed

**Why Tailwind CSS?**
- ✅ Utility-first for rapid development
- ✅ Consistent design tokens
- ✅ Excellent VS Code IntelliSense
- ✅ Purge unused styles for small bundle size
- ✅ Dark mode built-in

**Why shadcn/ui?**
- ✅ Pre-built components using Radix + Tailwind
- ✅ Copy-paste into your codebase (not a dependency)
- ✅ Fully customizable
- ✅ Great looking defaults

**Alternatives Considered:**
- ❌ Material-UI - Heavy bundle, opinionated design
- ❌ Ant Design - Opinionated, harder to customize
- ❌ Chakra UI - Good but less flexible than Radix

---

### Communication: Twilio

**Why Twilio?**
- ✅ Industry leader, reliable
- ✅ Excellent API and documentation
- ✅ Voice, SMS, and video in one platform
- ✅ Programmable webhooks
- ✅ Call recording and transcription
- ✅ Pay-as-you-go pricing

**Alternatives Considered:**
- ❌ Vonage (Nexmo) - Less intuitive API
- ❌ Plivo - Smaller ecosystem, less reliable
- ❌ MessageBird - Limited US presence

---

### Payments: Stripe

**Why Stripe?**
- ✅ Best-in-class payment API
- ✅ Excellent documentation
- ✅ Subscription billing built-in
- ✅ PCI compliance handled
- ✅ Strong fraud detection
- ✅ Transparent pricing

**Alternatives Considered:**
- ❌ PayPal - Worse developer experience
- ❌ Square - Better for in-person, worse for online
- ❌ Braintree - Good but owned by PayPal

---

### Hosting: Vercel

**Why Vercel?**
- ✅ Built by Next.js creators (best optimization)
- ✅ Zero-config deployment
- ✅ Automatic HTTPS and CDN
- ✅ Edge functions for low latency
- ✅ Preview deployments for PRs
- ✅ Excellent performance monitoring

**Alternatives Considered:**
- ❌ AWS - More configuration, steeper learning curve
- ❌ Netlify - Good but less Next.js-specific optimization
- ❌ Railway - Newer, less proven

---

## Data Architecture

### Multi-Tenancy Strategy

**Approach:** Shared database with tenant isolation via Row Level Security (RLS)

**Why this approach?**
- ✅ Cost-efficient (one database vs. thousands)
- ✅ Easy to maintain and update
- ✅ RLS enforces isolation at database level (impossible to bypass)
- ✅ Can scale to 100K+ tenants on single DB
- ✅ Easy analytics across all tenants

**Alternative Approaches:**
- ❌ Separate database per tenant - Expensive, hard to maintain, slow updates
- ❌ Separate schema per tenant - Better than separate DB but still complex
- ✅ **Shared database with RLS** - Best balance (our choice)

**Implementation:**
```sql
-- Every table has tenant_id
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  -- other columns...
);

-- RLS policy enforces tenant isolation
CREATE POLICY "Tenant isolation policy"
ON contacts FOR ALL
USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Enable RLS
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
```

---

### Database Design Patterns

#### 1. Audit Columns
Every table includes:
- `created_at` - Timestamp of creation
- `updated_at` - Timestamp of last update
- `created_by` - User who created (where applicable)

#### 2. Soft Deletes (Future)
For data retention and recovery:
- `deleted_at` - Timestamp of deletion (NULL if not deleted)
- Filter by `WHERE deleted_at IS NULL`

#### 3. Composite Keys for Performance
- `tenant_id` included in indexes for fast queries
- Example: `INDEX idx_contacts_tenant_email ON contacts(tenant_id, email)`

#### 4. Enums for Consistency
Use PostgreSQL enums for fixed value sets:
- `contact_type`, `job_status`, `call_status`, etc.
- Enforces valid values at database level
- Better than magic strings

---

### Supabase Realtime Architecture

**How it works:**
1. Client subscribes to database changes via WebSocket
2. Supabase listens to PostgreSQL replication stream
3. Changes matching filters are pushed to client
4. UI updates automatically

**Implementation:**
```typescript
// Subscribe to new messages for this tenant
const channel = supabase
  .channel('tenant-messages')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'sms_messages',
    filter: `tenant_id=eq.${tenantId}`
  }, (payload) => {
    // payload.new contains the new message
    setMessages(prev => [...prev, payload.new])
  })
  .subscribe()

// Cleanup on unmount
return () => supabase.removeChannel(channel)
```

**Performance Considerations:**
- Filters applied at database level (no unnecessary data sent)
- Automatic reconnection with exponential backoff
- Connection pooling handled by Supabase
- One WebSocket connection per client (not per subscription)

---

## Security Architecture

### Authentication Flow

```
┌────────┐         ┌──────────┐         ┌──────────┐
│ User   │────1───▶│ Next.js  │────2───▶│ Supabase │
│        │         │          │         │   Auth   │
└────────┘         └──────────┘         └──────────┘
    ▲                   │                     │
    │                   │                     │
    └──────────4────────┘                     │
                        │                     │
                        └───────3─────────────┘

1. User submits email/password
2. Next.js forwards to Supabase Auth
3. Supabase creates session, returns JWT
4. JWT stored in httpOnly cookie, user redirected to dashboard
```

**Security Features:**
- JWT tokens with short expiration (1 hour)
- Refresh tokens with longer expiration (7 days)
- httpOnly cookies (cannot be accessed by JavaScript)
- Automatic token refresh
- Secure flag for production (HTTPS only)

---

### Row Level Security (RLS)

**Every query is automatically filtered by tenant.**

**Example RLS Policy:**
```sql
-- Users can only SELECT their tenant's data
CREATE POLICY "select_own_tenant"
ON contacts FOR SELECT
USING (tenant_id IN (
  SELECT tenant_id FROM user_profiles
  WHERE id = auth.uid()
));

-- Users can only INSERT into their tenant
CREATE POLICY "insert_own_tenant"
ON contacts FOR INSERT
WITH CHECK (tenant_id IN (
  SELECT tenant_id FROM user_profiles
  WHERE id = auth.uid()
));
```

**Why RLS is critical:**
- ❌ **Without RLS:** One bug in application code could leak all tenant data
- ✅ **With RLS:** Database enforces isolation, even if app code is buggy
- ✅ Impossible to query another tenant's data, even with SQL injection
- ✅ Works for Supabase API, custom functions, and direct SQL

---

### Encryption of Sensitive Data

**Problem:** Twilio credentials (account SID, auth token) are sensitive and tenant-specific.

**Solution:** Encrypt at rest using PostgreSQL's `pgcrypto` extension.

**Implementation:**
```sql
-- Encrypted columns
CREATE TABLE twilio_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  account_sid_encrypted BYTEA,
  auth_token_encrypted BYTEA,
  phone_number_encrypted BYTEA,
  encryption_key_id TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Encrypt on insert
INSERT INTO twilio_settings (tenant_id, account_sid_encrypted)
VALUES (
  'tenant-uuid',
  pgp_sym_encrypt('ACxxx...', 'encryption-key')
);

-- Decrypt on read
SELECT pgp_sym_decrypt(account_sid_encrypted, 'encryption-key') AS account_sid
FROM twilio_settings
WHERE tenant_id = 'tenant-uuid';
```

**Key Management:**
- Encryption keys stored in environment variables
- Different keys per environment (dev, staging, prod)
- Key rotation strategy (future enhancement)

---

### Webhook Security

**Twilio webhooks must be validated to prevent spoofing.**

**Implementation:**
```typescript
import twilio from 'twilio'

export async function POST(request: NextRequest) {
  // Get Twilio signature from headers
  const signature = request.headers.get('x-twilio-signature')

  // Get request URL (must match exactly)
  const url = request.url

  // Get form parameters
  const formData = await request.formData()
  const params = Object.fromEntries(formData)

  // Validate signature
  const isValid = twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN,
    signature,
    url,
    params
  )

  if (!isValid) {
    return new Response('Invalid signature', { status: 403 })
  }

  // Process webhook...
}
```

**Common Gotchas:**
- URL must match exactly (http vs https, port, trailing slash)
- Use the auth token from the specific tenant, not a global one
- Request body must be read as form data, not JSON

---

## Communication Architecture

### Twilio Integration Architecture

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   Customer   │────1───▶│    Twilio    │────2───▶│  Webhook API │
│  (SMS/Call)  │         │              │         │  (Next.js)   │
└──────────────┘         └──────────────┘         └──────┬───────┘
                                                          │
                                                          │ 3
                                                          ▼
                                                   ┌──────────────┐
                                                   │   Supabase   │
                                                   │   Database   │
                                                   └──────┬───────┘
                                                          │
                                                          │ 4 (Realtime)
                                                          ▼
                                                   ┌──────────────┐
                                                   │  Client UI   │
                                                   │   (React)    │
                                                   └──────────────┘

1. Customer sends SMS or makes call to business number
2. Twilio receives and forwards to webhook URL
3. Webhook validates, stores in database
4. Realtime subscription pushes update to UI
```

---

### SMS Threading Strategy

**Challenge:** Group SMS messages into conversations by phone number.

**Solution:**
```typescript
// Normalize phone numbers (remove formatting)
const normalizePhone = (phone: string) => phone.replace(/\D/g, '')

// Find conversation by matching phone numbers
const conversation = await supabase
  .from('sms_messages')
  .select('*')
  .eq('tenant_id', tenantId)
  .or(`from_number.eq.${normalizePhone(phone)},to_number.eq.${normalizePhone(phone)}`)
  .order('created_at', { ascending: true })

// Group by contact
const groupedByContact = conversation.reduce((acc, msg) => {
  const contactPhone = msg.direction === 'inbound'
    ? msg.from_number
    : msg.to_number
  if (!acc[contactPhone]) acc[contactPhone] = []
  acc[contactPhone].push(msg)
  return acc
}, {})
```

---

### Call Flow Architecture

#### Outbound Call Flow
```typescript
// User clicks call button
1. POST /api/twilio/voice/outbound
   - Validate user and tenant
   - Decrypt Twilio credentials
   - Create call via Twilio API

2. Twilio connects user's phone to customer
   - Call status updates via webhooks
   - Recording starts (if enabled)

3. Call ends
   - Final status update via webhook
   - Recording URL stored in database
   - Duration logged for billing
```

#### Inbound Call Flow
```typescript
// Customer calls business number
1. Twilio receives call
   - Webhook GET /api/twilio/webhook/[tenantId]/voice

2. Server returns TwiML instructions
   - Forward to staff member
   - Play voicemail greeting
   - Record message

3. Call completes
   - Status updates logged
   - Recording (if voicemail) stored
   - Staff notified of missed call
```

---

## Scalability Strategy

### Current Capacity (MVP)
- **Concurrent users:** 1,000+
- **Tenants:** 1,000+
- **Database size:** 100GB+
- **API requests:** 1M+ per day

### Scaling Approach

#### 1. Database Scaling (Supabase/PostgreSQL)
**Vertical Scaling (First):**
- Upgrade to larger Supabase instance
- More CPU, RAM, storage
- Can handle 10K+ tenants easily

**Read Replicas (Later):**
- Separate read/write workloads
- Analytics queries on replica
- Realtime subscriptions on replica

**Connection Pooling:**
- Supabase includes built-in pooling
- 1000+ concurrent connections supported

---

#### 2. Application Scaling (Next.js/Vercel)
**Automatic Horizontal Scaling:**
- Vercel auto-scales based on traffic
- Edge functions deployed globally
- CDN caches static assets

**Optimization Strategies:**
- Server-side rendering for initial load
- Client-side caching with SWR/React Query
- Code splitting for smaller bundles
- Image optimization with Next.js Image

---

#### 3. Communication Scaling (Twilio)
**Twilio handles the hard part:**
- Scales automatically
- Pay per use (no capacity planning needed)
- Global infrastructure

**Our optimization:**
- Batch SMS when possible
- Cache Twilio credentials (decrypt once per request)
- Async webhook processing
- Rate limiting to prevent abuse

---

#### 4. Caching Strategy (Future)
**Client-side caching:**
- SWR for data fetching
- Optimistic UI updates
- Background revalidation

**Server-side caching (future):**
- Redis for session data
- Cache frequently accessed data (product catalog, etc.)
- Edge caching for static data

---

### Performance Targets
- **Page load time:** < 2 seconds (on 4G)
- **API response time:** < 500ms (p95)
- **Realtime latency:** < 1 second
- **Uptime:** 99.9% (< 43 minutes downtime per month)

---

## Design Decisions Log

### Decision 1: Multi-Page App vs. Single-Page App
**Date:** Initial project setup
**Decision:** Multi-page app with Next.js App Router
**Reasoning:**
- Better SEO (SSR for all pages)
- Faster initial page load
- Simpler mental model
- Still feels instant with prefetching
**Trade-offs:** Slight delay on navigation (acceptable)

---

### Decision 2: REST API vs. GraphQL
**Date:** Initial project setup
**Decision:** RESTful API via Supabase
**Reasoning:**
- Simpler for our use case
- Supabase auto-generates REST API
- Easier for future mobile app integration
- Less overhead than GraphQL server
**Trade-offs:** No fancy query optimization (not needed yet)

---

### Decision 3: Real-time vs. Polling
**Date:** Communication hub design
**Decision:** Real-time with Supabase Realtime
**Reasoning:**
- Better UX (instant updates)
- Less server load than frequent polling
- Supabase makes it easy
- Customers expect instant messaging
**Trade-offs:** More complex connection management

---

### Decision 4: Monorepo vs. Separate Repos
**Date:** Initial project setup
**Decision:** Monorepo (single repo for frontend + backend)
**Reasoning:**
- Next.js includes both frontend and API
- Simpler deployment (one Vercel project)
- Easier to share types between frontend and backend
- Less context switching for developers
**Trade-offs:** Larger repo size (acceptable)

---

### Decision 5: Client-side Encryption vs. Server-side Encryption
**Date:** Twilio integration
**Decision:** Server-side encryption with pgcrypto
**Reasoning:**
- Can't trust client with encryption keys
- Database encryption ensures data at rest is secure
- Transparent to client (just fetches decrypted data)
**Trade-offs:** Slight performance overhead (negligible)

---

### Decision 6: Type Generation vs. Manual Types
**Date:** Supabase integration
**Decision:** Auto-generate types from database schema (future)
**Reasoning:**
- Single source of truth (database schema)
- No drift between DB and types
- Less manual work
**Trade-offs:** Need to regenerate after schema changes

---

### Decision 7: Component Library vs. Custom Components
**Date:** UI design phase
**Decision:** shadcn/ui (Radix + Tailwind)
**Reasoning:**
- Best of both worlds (pre-built + customizable)
- Copy-paste into codebase (no dependency version hell)
- Accessible out of the box
- Looks modern without custom design work
**Trade-offs:** More code in repo (acceptable)

---

### Decision 8: Tenant-specific Webhooks vs. Shared Webhook
**Date:** Twilio integration design
**Decision:** Tenant-specific webhook URLs
**Example:** `/api/twilio/webhook/[tenantId]/voice`
**Reasoning:**
- Easier to isolate and debug per tenant
- Can scale webhooks independently
- Clearer in Twilio dashboard which webhook is for which tenant
**Trade-offs:** More webhook URLs to configure (worth it)

---

### Decision 9: Optimistic Updates vs. Wait for Server
**Date:** Communication UI
**Decision:** Optimistic updates with rollback on error
**Reasoning:**
- Instant feedback (feels faster)
- Modern messaging apps work this way
- Easy to implement with Zustand
**Trade-offs:** Complexity in error handling

---

### Decision 10: Edge Functions vs. Serverless Functions
**Date:** API design
**Decision:** Use Next.js API routes (Vercel serverless)
**Reasoning:**
- Simple to implement (just export async function)
- Automatic deployment with Next.js
- Great cold start performance on Vercel
- Can upgrade to Edge Functions later if needed
**Trade-offs:** Slightly slower than Edge Functions (acceptable)

---

## Future Architecture Considerations

### 1. Mobile Native Apps (iOS/Android)
**Current:** Progressive Web App (PWA)
**Future:** Native apps with React Native or Flutter

**Considerations:**
- Share business logic with web app
- Use same Supabase backend
- Consider GraphQL for more efficient mobile data fetching
- Offline-first architecture for field technicians

---

### 2. Microservices (If Needed)
**Current:** Monolithic Next.js app
**Future:** Extract high-load services (e.g., webhook processing)

**Candidates for extraction:**
- Webhook processing service (async job queue)
- PDF generation service (estimates, invoices)
- Email sending service (campaigns)
- Analytics/reporting service

**When to extract:**
- Service is slowing down main app
- Service needs different scaling characteristics
- Service has high CPU/memory needs

---

### 3. Event-Driven Architecture
**Current:** Direct database writes
**Future:** Event bus for cross-service communication

**Example:**
```
Job Completed → Event Bus → [
  Send invoice email,
  Update analytics,
  Request review,
  Schedule follow-up
]
```

**Technologies:**
- AWS EventBridge
- Google Cloud Pub/Sub
- Supabase Realtime (as lightweight event bus)

---

### 4. Advanced Analytics
**Current:** Basic reports in PostgreSQL
**Future:** Data warehouse for complex analytics

**Considerations:**
- Extract data to BigQuery or Snowflake
- Build OLAP cubes for fast queries
- Machine learning for predictions (churn, LTV, demand)
- Business intelligence tools (Looker, Metabase)

---

### 5. Multi-Region Deployment
**Current:** Single region (US)
**Future:** Global deployment for international customers

**Considerations:**
- Deploy Next.js app to multiple regions (Vercel supports this)
- PostgreSQL read replicas in each region
- Distributed caching with Redis
- CDN for static assets (already have with Vercel)

---

### 6. AI/ML Features
**Future Enhancements:**
- Smart scheduling (predict optimal appointment times)
- Dynamic pricing (based on demand, season, customer)
- Churn prediction (identify at-risk customers)
- Demand forecasting (plan capacity)
- Automated follow-ups (AI-generated messages)

**Technologies:**
- OpenAI API for text generation
- TensorFlow or PyTorch for custom models
- Anthropic Claude for conversational AI
- Vector database (Pinecone, Weaviate) for semantic search

---

## Monitoring & Observability

### Current Monitoring (To Implement)
- **Vercel Analytics** - Page views, performance metrics
- **Supabase Dashboard** - Database performance, query stats
- **Twilio Console** - Call/SMS logs, delivery status

### Future Monitoring (Production)
- **Error Tracking:** Sentry for frontend and backend errors
- **APM:** Datadog or New Relic for application performance
- **Logging:** Structured logs with LogFlare or Papertrail
- **Uptime Monitoring:** Pingdom or UptimeRobot
- **Alerting:** PagerDuty for critical issues

### Key Metrics to Track
- **Performance:** Page load time, API response time, database query time
- **Availability:** Uptime, error rate, failed requests
- **Business:** Active users, new signups, churn rate, revenue
- **Usage:** SMS sent, calls made, jobs created, invoices sent

---

## Development Workflow

### Local Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run linter
npm run lint

# Run tests
npm run test
```

### Git Workflow
1. Create feature branch from `main`
2. Make changes, commit frequently
3. Push branch, create pull request
4. Code review and approval
5. Merge to `main`
6. Automatic deployment to staging
7. Manual promotion to production

### Deployment Pipeline
```
Git Push → GitHub → Vercel → Deploy to Preview URL
                            ↓
                     Manual Approval
                            ↓
                     Deploy to Production
```

---

## Questions & Future Research

### Open Questions
1. **Should we build a mobile app or stick with PWA?**
   - Research: User feedback on PWA experience
   - Decision timeline: Q2 2025

2. **How do we handle long-running tasks (PDF generation, email sending)?**
   - Options: Vercel background functions, separate job queue (BullMQ + Redis)
   - Decision timeline: When it becomes a performance issue

3. **What's our disaster recovery plan?**
   - Supabase has daily backups
   - Need to document recovery procedures
   - Consider multi-region failover (future)

4. **How do we handle GDPR and data deletion requests?**
   - Implement data export feature
   - Implement hard delete for tenant data
   - Document data retention policies

---

## Related Documents
- [Product Requirements (PRD)](./PRD.md)
- [Codebase Documentation](./codebase.md)
- [Project Plan](./plan.md)
- [Database Schema](./supabase/schema.sql)

---

## Maintenance

**Update this document when you:**
- Make a significant architectural decision
- Change a core technology or framework
- Refactor a major system component
- Add a new external integration
- Change the deployment or infrastructure

**Update checklist:**
- [ ] Add decision to Design Decisions Log
- [ ] Update relevant diagrams
- [ ] Note trade-offs and alternatives considered
- [ ] Update "Last Updated" date at top
- [ ] Add note to [CHANGELOG-REMINDER.md](./CHANGELOG-REMINDER.md)

---

**Have architectural questions? Create an issue or discuss with the team!**