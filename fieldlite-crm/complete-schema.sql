-- ================================================================================
-- FIELDLITE CRM - COMPLETE DATABASE SCHEMA
-- Generated: 2025-09-29
-- Database: PostgreSQL (Supabase)
-- ================================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================================================================================
-- CUSTOM ENUM TYPES
-- ================================================================================

CREATE TYPE public.contact_type AS ENUM ('lead', 'customer', 'vendor');
CREATE TYPE public.call_direction AS ENUM ('inbound', 'outbound');
CREATE TYPE public.call_status AS ENUM ('queued', 'ringing', 'in-progress', 'completed', 'busy', 'failed', 'no-answer', 'canceled');
CREATE TYPE public.job_status AS ENUM ('scheduled', 'in_progress', 'paused', 'complete', 'canceled');
CREATE TYPE public.job_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE public.job_type AS ENUM ('installation', 'maintenance', 'repair', 'inspection', 'consultation', 'emergency', 'other');
CREATE TYPE public.payment_status AS ENUM ('pending', 'partial', 'paid', 'overdue');
CREATE TYPE public.payment_method AS ENUM ('card', 'ach', 'cash', 'check');
CREATE TYPE public.user_role AS ENUM ('owner', 'manager', 'estimator', 'tech', 'bookkeeper');
CREATE TYPE public.invoice_status AS ENUM ('draft', 'sent', 'partial', 'paid', 'overdue', 'void');
CREATE TYPE public.estimate_status AS ENUM ('draft', 'sent', 'accepted', 'declined', 'expired');
CREATE TYPE public.deal_stage AS ENUM ('new', 'qualified', 'estimating', 'quoted', 'won', 'lost');
CREATE TYPE public.message_channel AS ENUM ('sms', 'email');

-- ================================================================================
-- CORE TABLES
-- ================================================================================

-- Tenants table (multi-tenant architecture)
CREATE TABLE public.tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    subdomain TEXT UNIQUE,
    plan TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    phone TEXT,
    role public.user_role DEFAULT 'tech',
    permissions JSONB DEFAULT '{}',
    active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Companies table
CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    industry TEXT,
    size TEXT,
    website TEXT,
    phone TEXT,
    email TEXT,
    address JSONB,
    logo_url TEXT,
    notes TEXT,
    annual_revenue NUMERIC(15,2),
    employee_count INTEGER,
    tags TEXT[] DEFAULT '{}',
    custom_fields JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Contacts table
CREATE TABLE public.contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    type public.contact_type DEFAULT 'lead',
    first_name TEXT,
    last_name TEXT,
    company TEXT,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    email TEXT,
    phone TEXT,
    phones TEXT[] DEFAULT '{}',
    address JSONB,
    job_title TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    country TEXT DEFAULT 'USA',
    timezone TEXT,
    avatar_url TEXT,
    lead_source TEXT,
    lead_source_details JSONB,
    lifecycle_stage TEXT,
    tier TEXT,
    owner_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    notes TEXT,
    tags TEXT[] DEFAULT '{}',
    last_contacted TIMESTAMP WITH TIME ZONE,
    source VARCHAR(100),
    status VARCHAR(50),
    preferred_channel TEXT,
    do_not_disturb BOOLEAN DEFAULT false,
    opted_out_channels TEXT[] DEFAULT '{}',
    language TEXT DEFAULT 'en',
    email_consent BOOLEAN DEFAULT true,
    sms_consent BOOLEAN DEFAULT true,
    voice_consent BOOLEAN DEFAULT true,
    whatsapp_consent BOOLEAN DEFAULT false,
    dnc_list BOOLEAN DEFAULT false,
    custom_fields JSONB DEFAULT '{}',
    total_conversations INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Deals table
CREATE TABLE public.deals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    stage public.deal_stage DEFAULT 'new',
    probability INTEGER CHECK (probability >= 0 AND probability <= 100),
    estimated_value NUMERIC(15,2),
    actual_value NUMERIC(15,2),
    expected_close_date DATE,
    closed_date DATE,
    lost_reason TEXT,
    source TEXT,
    campaign TEXT,
    owner_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Estimates table
CREATE TABLE public.estimates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
    estimate_number TEXT UNIQUE NOT NULL,
    status public.estimate_status DEFAULT 'draft',
    subtotal NUMERIC(15,2) DEFAULT 0,
    discount_amount NUMERIC(15,2) DEFAULT 0,
    tax_amount NUMERIC(15,2) DEFAULT 0,
    total_amount NUMERIC(15,2) DEFAULT 0,
    valid_until DATE,
    terms TEXT,
    notes TEXT,
    signer_name TEXT,
    signer_email TEXT,
    signed_at TIMESTAMP WITH TIME ZONE,
    signature_data TEXT,
    pdf_url TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Jobs table
CREATE TABLE public.jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
    estimate_id UUID REFERENCES public.estimates(id) ON DELETE SET NULL,
    job_number TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status public.job_status DEFAULT 'scheduled',
    priority public.job_priority DEFAULT 'medium',
    type public.job_type DEFAULT 'other',
    scheduled_start TIMESTAMP WITH TIME ZONE,
    scheduled_end TIMESTAMP WITH TIME ZONE,
    actual_start TIMESTAMP WITH TIME ZONE,
    actual_end TIMESTAMP WITH TIME ZONE,
    address JSONB,
    customer_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    customer_name VARCHAR(200),
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50),
    assigned_to UUID[] DEFAULT '{}',
    crew_lead_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    team_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    estimated_duration INTEGER, -- in minutes
    estimated_cost NUMERIC(15,2),
    actual_cost NUMERIC(15,2),
    invoice_id UUID,
    payment_status public.payment_status DEFAULT 'pending',
    required_photos TEXT[] DEFAULT '{}',
    required_checklists JSONB,
    required_skills TEXT[] DEFAULT '{}',
    required_equipment TEXT[] DEFAULT '{}',
    notes TEXT,
    internal_notes TEXT,
    tags TEXT[] DEFAULT '{}',
    custom_fields JSONB DEFAULT '{}',
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Invoices table
CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    invoice_number TEXT UNIQUE NOT NULL,
    status public.invoice_status DEFAULT 'draft',
    subtotal NUMERIC(15,2) DEFAULT 0,
    discount_amount NUMERIC(15,2) DEFAULT 0,
    tax_amount NUMERIC(15,2) DEFAULT 0,
    total_amount NUMERIC(15,2) DEFAULT 0,
    amount_paid NUMERIC(15,2) DEFAULT 0,
    amount_due NUMERIC(15,2) DEFAULT 0,
    due_date DATE,
    deposit_required NUMERIC(15,2),
    terms TEXT,
    notes TEXT,
    pdf_url TEXT,
    stripe_invoice_id TEXT,
    quickbooks_id TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key for jobs.invoice_id
ALTER TABLE public.jobs ADD CONSTRAINT jobs_invoice_id_fkey
    FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL;

-- Payments table
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
    amount NUMERIC(15,2) NOT NULL,
    method public.payment_method,
    processor TEXT,
    processor_payment_id TEXT,
    status TEXT,
    paid_at TIMESTAMP WITH TIME ZONE,
    fee NUMERIC(15,2),
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ================================================================================
-- COMMUNICATION TABLES
-- ================================================================================

-- Calls table
CREATE TABLE public.calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    twilio_call_sid TEXT UNIQUE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    from_number TEXT,
    to_number TEXT,
    direction public.call_direction,
    status public.call_status,
    duration_seconds INTEGER,
    answered_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    recording_url TEXT,
    recording_duration INTEGER,
    transcription TEXT,
    voicemail_url TEXT,
    price NUMERIC(10,4),
    price_unit TEXT,
    notes TEXT,
    tags TEXT[] DEFAULT '{}',
    deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
    job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
    outcome VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Messages table
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    thread_id UUID,
    direction TEXT CHECK (direction IN ('inbound', 'outbound')),
    channel public.message_channel,
    from_address TEXT,
    to_address TEXT,
    subject TEXT,
    body TEXT,
    attachments JSONB DEFAULT '[]',
    related_type TEXT,
    related_id UUID,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Call events table
CREATE TABLE public.call_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID REFERENCES public.calls(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    event_data JSONB DEFAULT '{}',
    twilio_callback_source TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Call notes table
CREATE TABLE public.call_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID REFERENCES public.calls(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Call schedules table
CREATE TABLE public.call_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    title VARCHAR(255),
    notes TEXT,
    status VARCHAR(50) DEFAULT 'scheduled',
    reminder_sent BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Twilio configurations table
CREATE TABLE public.twilio_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
    account_sid TEXT NOT NULL,
    auth_token TEXT NOT NULL, -- Should be encrypted
    phone_number TEXT,
    phone_number_sid TEXT,
    webhook_base_url TEXT,
    forwarding_number TEXT,
    is_active BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMP WITH TIME ZONE,
    capabilities JSONB DEFAULT '{}',
    encryption_version VARCHAR(10),
    last_migration TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ================================================================================
-- SUPPORTING TABLES
-- ================================================================================

-- Contact activities table
CREATE TABLE public.contact_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    activity_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    subject TEXT,
    description TEXT,
    outcome TEXT,
    duration INTEGER, -- in minutes
    related_to_id UUID,
    related_to_type TEXT,
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Contact notes table
CREATE TABLE public.contact_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Job tasks table
CREATE TABLE public.job_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending',
    assignee_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    required_photo BOOLEAN DEFAULT false,
    photo_urls TEXT[] DEFAULT '{}',
    checklist JSONB,
    completed_at TIMESTAMP WITH TIME ZONE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Time logs table
CREATE TABLE public.time_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    clock_in TIMESTAMP WITH TIME ZONE NOT NULL,
    clock_out TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    gps_start JSONB,
    gps_end JSONB,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Catalog items table
CREATE TABLE public.catalog_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    sku TEXT UNIQUE,
    name TEXT NOT NULL,
    category TEXT,
    description TEXT,
    unit_of_measure TEXT DEFAULT 'each',
    unit_price NUMERIC(15,2) DEFAULT 0,
    unit_cost NUMERIC(15,2) DEFAULT 0,
    tax_rate NUMERIC(5,4) DEFAULT 0,
    is_bundle BOOLEAN DEFAULT false,
    bundle_items JSONB,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Estimate items table
CREATE TABLE public.estimate_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    estimate_id UUID REFERENCES public.estimates(id) ON DELETE CASCADE,
    catalog_item_id UUID REFERENCES public.catalog_items(id) ON DELETE SET NULL,
    description TEXT,
    quantity NUMERIC(15,4) DEFAULT 1,
    unit_of_measure TEXT,
    unit_price NUMERIC(15,2) DEFAULT 0,
    unit_cost NUMERIC(15,2) DEFAULT 0,
    tax_rate NUMERIC(5,4) DEFAULT 0,
    discount_percent NUMERIC(5,2) DEFAULT 0,
    line_total NUMERIC(15,2) DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Products table (legacy or additional product management)
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sku VARCHAR(100) UNIQUE,
    price NUMERIC(15,2) DEFAULT 0,
    cost NUMERIC(15,2) DEFAULT 0,
    quantity INTEGER DEFAULT 0,
    category VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Files table
CREATE TABLE public.files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    related_type TEXT,
    related_id UUID,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    mime_type TEXT,
    size_bytes INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs table
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    changes JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ================================================================================
-- INDEXES FOR PERFORMANCE
-- ================================================================================

-- Tenant isolation indexes
CREATE INDEX idx_contacts_tenant_id ON public.contacts(tenant_id);
CREATE INDEX idx_companies_tenant_id ON public.companies(tenant_id);
CREATE INDEX idx_jobs_tenant_id ON public.jobs(tenant_id);
CREATE INDEX idx_calls_tenant_id ON public.calls(tenant_id);
CREATE INDEX idx_messages_tenant_id ON public.messages(tenant_id);
CREATE INDEX idx_invoices_tenant_id ON public.invoices(tenant_id);
CREATE INDEX idx_payments_tenant_id ON public.payments(tenant_id);

-- Foreign key indexes
CREATE INDEX idx_contacts_company_id ON public.contacts(company_id);
CREATE INDEX idx_contacts_owner_user_id ON public.contacts(owner_user_id);
CREATE INDEX idx_jobs_customer_id ON public.jobs(customer_id);
CREATE INDEX idx_jobs_deal_id ON public.jobs(deal_id);
CREATE INDEX idx_calls_contact_id ON public.calls(contact_id);
CREATE INDEX idx_invoices_job_id ON public.invoices(job_id);
CREATE INDEX idx_payments_invoice_id ON public.payments(invoice_id);

-- Search and lookup indexes
CREATE INDEX idx_contacts_email ON public.contacts(email);
CREATE INDEX idx_contacts_phone ON public.contacts(phone);
CREATE INDEX idx_calls_twilio_call_sid ON public.calls(twilio_call_sid);
CREATE INDEX idx_jobs_job_number ON public.jobs(job_number);
CREATE INDEX idx_invoices_invoice_number ON public.invoices(invoice_number);
CREATE INDEX idx_estimates_estimate_number ON public.estimates(estimate_number);

-- Status and date indexes
CREATE INDEX idx_jobs_status ON public.jobs(status);
CREATE INDEX idx_jobs_scheduled_start ON public.jobs(scheduled_start);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_due_date ON public.invoices(due_date);
CREATE INDEX idx_calls_created_at ON public.calls(created_at DESC);

-- ================================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================================================

-- Enable RLS on all tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Example RLS policies (adjust based on your auth structure)
-- These assume auth.uid() returns the user's profile ID

-- Profiles: Users can only see profiles in their tenant
CREATE POLICY "Users can view profiles in their tenant" ON public.profiles
    FOR SELECT USING (
        tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    );

-- Contacts: Users can only see contacts in their tenant
CREATE POLICY "Users can view contacts in their tenant" ON public.contacts
    FOR SELECT USING (
        tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Users can create contacts in their tenant" ON public.contacts
    FOR INSERT WITH CHECK (
        tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Users can update contacts in their tenant" ON public.contacts
    FOR UPDATE USING (
        tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    );

-- Similar policies would be created for other tables...

-- ================================================================================
-- TRIGGER FUNCTIONS
-- ================================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_calls_updated_at BEFORE UPDATE ON public.calls
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ================================================================================
-- HELPER FUNCTIONS
-- ================================================================================

-- Function to calculate job duration
CREATE OR REPLACE FUNCTION public.calculate_job_duration(job_id UUID)
RETURNS INTEGER AS $$
DECLARE
    duration INTEGER;
BEGIN
    SELECT EXTRACT(EPOCH FROM (actual_end - actual_start))/60 INTO duration
    FROM public.jobs
    WHERE id = job_id AND actual_start IS NOT NULL AND actual_end IS NOT NULL;

    RETURN COALESCE(duration, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to calculate invoice balance
CREATE OR REPLACE FUNCTION public.calculate_invoice_balance(invoice_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    balance NUMERIC;
BEGIN
    SELECT total_amount - COALESCE(amount_paid, 0) INTO balance
    FROM public.invoices
    WHERE id = invoice_id;

    RETURN COALESCE(balance, 0);
END;
$$ LANGUAGE plpgsql;

-- ================================================================================
-- COMMENTS FOR DOCUMENTATION
-- ================================================================================

COMMENT ON TABLE public.tenants IS 'Multi-tenant organizations';
COMMENT ON TABLE public.profiles IS 'User profiles within each tenant';
COMMENT ON TABLE public.contacts IS 'CRM contacts including leads and customers';
COMMENT ON TABLE public.companies IS 'B2B company entities';
COMMENT ON TABLE public.deals IS 'Sales opportunities and pipeline';
COMMENT ON TABLE public.jobs IS 'Field service jobs and work orders';
COMMENT ON TABLE public.invoices IS 'Billing and invoicing records';
COMMENT ON TABLE public.calls IS 'Call tracking and history via Twilio';
COMMENT ON TABLE public.messages IS 'SMS and email message history';

COMMENT ON COLUMN public.contacts.dnc_list IS 'Do Not Call list flag';
COMMENT ON COLUMN public.jobs.payment_status IS 'Current payment status of the job';
COMMENT ON COLUMN public.twilio_configurations.auth_token IS 'Encrypted Twilio auth token';

-- ================================================================================
-- END OF SCHEMA
-- ================================================================================