# FieldLite CRM - Build Roadmap & Implementation Guide

## Project Overview
**Target:** Local/home-service SMBs (1-50 employees)
**Core Value:** Fast quotes → jobs → invoices → payments workflow
**Timeline:** 8-10 weeks to MVP, 12 weeks to V1.0

## Tech Stack Decision
```
Frontend:  Next.js 15+ (App Router), TypeScript, Tailwind CSS
Backend:   Supabase (PostgreSQL + Auth + Realtime + Storage)
Payments:  Stripe
Mobile:    Progressive Web App (PWA)
PDF:       React-PDF or Puppeteer
SMS:       Twilio/Telnyx
Email:     SendGrid/AWS SES
Maps:      Google Maps API
```

---

## PHASE 1: Foundation & Infrastructure (Week 1-2)
**Goal:** Bulletproof multi-tenant architecture with auth

### Database Setup
- [x] Initialize Supabase project
- [x] Create tenant isolation schema
- [x] Implement Row Level Security (RLS) policies
- [x] Set up audit logging tables

### Core Tables
```sql
-- Tenants table with RLS
CREATE TABLE tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subdomain text UNIQUE,
  plan text DEFAULT 'pro',
  created_at timestamptz DEFAULT now()
);

-- Users with tenant association
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id),
  email text UNIQUE NOT NULL,
  name text,
  role text CHECK (role IN ('owner','manager','estimator','tech','bookkeeper')),
  permissions jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
```

### Authentication
- [x] Email/OTP authentication
- [x] Google OAuth integration
- [x] Session management
- [x] Role-based access control (RBAC)
- [x] Tenant context middleware

### Next.js Setup
- [x] Initialize Next.js 15 with TypeScript
- [x] Configure Tailwind CSS
- [x] Set up Supabase client
- [ ] Create auth context/hooks (partially done - middleware exists)
- [x] Build login/signup pages

---

## PHASE 2: Core Business Objects (Week 2-3)
**Goal:** Lead capture to deal conversion flow

### Contacts Module
- [ ] CRUD operations for contacts
- [ ] Lead/Customer/Vendor types
- [ ] Tags and custom fields
- [ ] Search and filtering
- [ ] Bulk actions

### Database Schema
```sql
CREATE TABLE contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id),
  type text CHECK (type IN ('lead','customer','vendor')),
  first_name text,
  last_name text,
  company text,
  email text,
  phones text[],
  address jsonb,
  tags text[],
  lead_source text,
  owner_user_id uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id),
  contact_id uuid REFERENCES contacts(id),
  title text NOT NULL,
  stage text DEFAULT 'new',
  probability integer DEFAULT 0,
  est_amount numeric(10,2),
  expected_close_date date,
  created_at timestamptz DEFAULT now()
);
```

### Pipeline Management
- [ ] Kanban board view
- [ ] Drag-and-drop stage changes
- [ ] Pipeline stages configuration
- [ ] Deal quick actions
- [ ] Win/loss tracking

### Lead Capture
- [ ] Public webhook endpoint
- [ ] Form builder/embedder
- [ ] UTM tracking
- [ ] Auto-assignment rules
- [ ] Duplicate detection

---

## PHASE 3: Estimation & Quoting (Week 3-4)
**Goal:** Professional estimates with e-signature

### Catalog/Pricebook
- [ ] Products and services catalog
- [ ] Categories and SKUs
- [ ] Bundle/assembly items
- [ ] Cost tracking
- [ ] Tax rules per item

### Estimate Builder
- [ ] Line item management
- [ ] Quantity and pricing calculations
- [ ] Discounts (line-level and total)
- [ ] Tax calculations
- [ ] Terms and conditions
- [ ] Multi-option quotes (Good/Better/Best)

### Document Generation
- [ ] Professional PDF templates
- [ ] Company branding
- [ ] Photo attachments
- [ ] Preview before sending

### E-Signature
- [ ] Signature capture
- [ ] Email verification
- [ ] Timestamp and IP logging
- [ ] Acceptance workflow
- [ ] Automated status updates

---

## PHASE 4: Jobs & Scheduling (Week 4-5)
**Goal:** Field-ready job management with mobile app

### Jobs System
```sql
CREATE TABLE jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id),
  deal_id uuid REFERENCES deals(id),
  estimate_id uuid REFERENCES estimates(id),
  number text NOT NULL,
  status text DEFAULT 'scheduled',
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  assigned_crew_id uuid,
  address jsonb,
  notes text,
  created_at timestamptz DEFAULT now()
);
```

### Scheduling Calendar
- [ ] Day/Week/Month views
- [ ] Drag-and-drop scheduling
- [ ] Crew/tech assignment
- [ ] Conflict detection
- [ ] Travel time calculation

### Mobile PWA
- [ ] Responsive design
- [ ] Offline capability
- [ ] Job list view
- [ ] Clock in/out
- [ ] GPS tracking (optional)

### Job Execution
- [ ] Task checklists
- [ ] Required photos
- [ ] Material usage tracking
- [ ] Customer signatures
- [ ] Completion notes

---

## PHASE 5: Invoicing & Payments (Week 5-6)
**Goal:** Get paid fast with online payments

### Invoice Generation
- [ ] Auto-generate from jobs
- [ ] Line items from estimate
- [ ] Additional charges
- [ ] Deposits and partials
- [ ] Payment terms

### Stripe Integration
- [ ] Payment intents
- [ ] Card payments
- [ ] ACH transfers
- [ ] Payment links
- [ ] Webhook handling
- [ ] Fee tracking

### Payment Management
- [ ] Payment recording
- [ ] Partial payments
- [ ] Payment history
- [ ] Outstanding balance tracking
- [ ] Overdue notifications

---

## PHASE 6: Communications (Week 6-7)
**Goal:** Automated customer communications

### SMS Integration (Twilio)
- [ ] 2-way messaging
- [ ] Message templates
- [ ] Bulk SMS
- [ ] Appointment reminders
- [ ] Status updates

### Email System
- [ ] Transactional emails
- [ ] Email templates
- [ ] Attachments (PDFs)
- [ ] Tracking (opens/clicks)
- [ ] Unsubscribe handling

### Automation Triggers
- [ ] Lead follow-up sequences
- [ ] Estimate reminders
- [ ] Job confirmations
- [ ] Payment reminders
- [ ] Review requests

---

## PHASE 7: Reporting & Analytics (Week 7-8)
**Goal:** Data-driven decision making

### Dashboard
- [ ] Revenue metrics
- [ ] Pipeline overview
- [ ] Job status summary
- [ ] Tech utilization
- [ ] Recent activity feed

### Reports
- [ ] Pipeline by stage
- [ ] Win/loss analysis
- [ ] Job profitability
- [ ] Technician performance
- [ ] Lead source ROI
- [ ] Accounts receivable aging

### Export & Sharing
- [ ] CSV export
- [ ] PDF reports
- [ ] Scheduled emails
- [ ] Saved report templates

---

## PHASE 8: Integrations & Polish (Week 8-10)
**Goal:** External connections and refinements

### QuickBooks Integration
- [ ] Customer sync
- [ ] Invoice sync
- [ ] Payment sync
- [ ] Item catalog sync
- [ ] Tax mapping

### Additional Features
- [ ] Google Maps integration
- [ ] Review request system
- [ ] Basic inventory tracking
- [ ] Data import tools (CSV)
- [ ] Webhook system for Zapier
- [ ] API documentation

### Security & Compliance
- [ ] Security audit
- [ ] GDPR/CCPA compliance
- [ ] Data export tools
- [ ] Backup strategy
- [ ] Performance optimization

---

## MVP Checklist (6 weeks)
**Minimum viable product to get first paying customer:**

✅ **Week 1-2: Foundation**
- [x] Multi-tenant auth working
- [x] Basic user roles
- [ ] Tenant switching (needs UI implementation)

✅ **Week 2-3: Core Flow**
- [ ] Create and manage contacts
- [ ] Basic pipeline view
- [ ] Lead capture form

✅ **Week 3-4: Estimates**
- [ ] Simple estimate builder
- [ ] PDF generation
- [ ] Email sending

✅ **Week 4-5: Jobs**
- [ ] Convert estimate to job
- [ ] Basic scheduling
- [ ] Mobile check-in

✅ **Week 5-6: Payments**
- [ ] Generate invoices
- [ ] Stripe payment collection
- [ ] Payment confirmation

---

## Quick Start Commands

### Initialize Project
```bash
# Create Next.js app
npx create-next-app@latest fieldlite-crm --typescript --tailwind --app

# Install dependencies
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
npm install stripe @stripe/stripe-js
npm install react-pdf @react-pdf/renderer
npm install react-query zustand
npm install react-hook-form zod
npm install date-fns
npm install lucide-react
```

### Supabase Setup
```bash
# Install Supabase CLI
npm install -g supabase

# Initialize Supabase
supabase init

# Start local development
supabase start

# Create migration
supabase migration new initial_schema
```

### Environment Variables
```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

STRIPE_SECRET_KEY=your_stripe_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_public

TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_number

SENDGRID_API_KEY=your_sendgrid_key
```

---

## Performance Targets
- Page load: < 2.5s on 4G
- API response: < 250ms (read), < 500ms (write)
- Uptime: 99.9% monthly
- Mobile score: 90+ Lighthouse

## Success Metrics
- Time to first invoice: < 7 days
- Estimate-to-win time: 20% faster
- On-time arrivals: 15% increase
- Customer reviews: 2+ per 100 jobs

---

## Daily Development Checklist

### Morning
- [ ] Review yesterday's progress
- [ ] Update todo list status
- [ ] Check for blocking issues
- [ ] Plan today's tasks

### Development
- [ ] Write tests first (TDD)
- [ ] Implement feature
- [ ] Test on mobile
- [ ] Update documentation

### Evening
- [ ] Commit changes
- [ ] Update progress tracker
- [ ] Note blockers/questions
- [ ] Plan tomorrow

---

## Resources & Documentation

### Key Documentation
- [Next.js App Router](https://nextjs.org/docs/app)
- [Supabase Docs](https://supabase.com/docs)
- [Stripe API](https://stripe.com/docs/api)
- [Twilio SMS](https://www.twilio.com/docs/sms)

### UI Component Libraries
- [Shadcn/ui](https://ui.shadcn.com/)
- [Headless UI](https://headlessui.com/)
- [Radix UI](https://www.radix-ui.com/)

### Testing Tools
- [Playwright](https://playwright.dev/) - E2E testing
- [Vitest](https://vitest.dev/) - Unit testing
- [MSW](https://mswjs.io/) - API mocking

---

## Notes & Decisions Log

### Architecture Decisions
1. **Supabase over custom backend:** Faster time to market, built-in auth, realtime
2. **PWA over native mobile:** Single codebase, easier updates, good enough UX
3. **Stripe only for payments:** Don't build payment infrastructure
4. **Server components first:** Better SEO, faster initial load

### Technical Debt to Address Later
- [ ] Redis caching layer
- [ ] Background job queue
- [ ] Elasticsearch for advanced search
- [ ] Microservices architecture
- [ ] Native mobile apps

### Lessons Learned
- Start with RLS from day 1
- Don't overcomplicate permissions early
- Get to invoice ASAP
- Mobile UX is critical for field workers
- Automate follow-ups = higher conversion

---

**Last Updated:** 2025-01-21
**Version:** 1.0.0
**Status:** Ready to Build