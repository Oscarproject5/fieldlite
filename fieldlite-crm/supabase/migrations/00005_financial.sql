-- Migration: 00005_financial
-- Description: Add financial tables for estimates, invoices, and payments
-- Created: 2025-01-01

-- Create catalog items table
CREATE TABLE public.catalog_items (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  sku text,
  name text NOT NULL,
  category text,
  description text,
  unit_of_measure text DEFAULT 'each'::text,
  unit_price numeric,
  unit_cost numeric,
  tax_rate numeric DEFAULT 0,
  is_bundle boolean DEFAULT false,
  bundle_items jsonb,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create estimates table
CREATE TABLE public.estimates (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  estimate_number text NOT NULL,
  status estimate_status DEFAULT 'draft'::estimate_status,
  subtotal numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  valid_until date,
  terms text,
  notes text,
  signer_name text,
  signer_email text,
  signed_at timestamp with time zone,
  signature_data text,
  pdf_url text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create estimate items table
CREATE TABLE public.estimate_items (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  estimate_id uuid NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
  catalog_item_id uuid REFERENCES public.catalog_items(id) ON DELETE SET NULL,
  description text NOT NULL,
  quantity numeric DEFAULT 1,
  unit_of_measure text,
  unit_price numeric,
  unit_cost numeric,
  tax_rate numeric DEFAULT 0,
  discount_percent numeric DEFAULT 0,
  line_total numeric,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create invoices table
CREATE TABLE public.invoices (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  invoice_number text NOT NULL,
  status invoice_status DEFAULT 'draft'::invoice_status,
  subtotal numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  amount_paid numeric DEFAULT 0,
  amount_due numeric DEFAULT 0,
  due_date date,
  deposit_required numeric,
  terms text,
  notes text,
  pdf_url text,
  stripe_invoice_id text,
  quickbooks_id text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create payments table
CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  method payment_method,
  processor text DEFAULT 'stripe'::text,
  processor_payment_id text,
  status text DEFAULT 'pending'::text,
  paid_at timestamp with time zone,
  fee numeric,
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Now add the foreign key columns to jobs table
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS estimate_id uuid REFERENCES public.estimates(id) ON DELETE SET NULL;

-- Add indexes
CREATE INDEX idx_catalog_items_tenant_id ON public.catalog_items(tenant_id);
CREATE INDEX idx_estimates_tenant_id ON public.estimates(tenant_id);
CREATE INDEX idx_estimates_deal_id ON public.estimates(deal_id);
CREATE INDEX idx_estimate_items_estimate_id ON public.estimate_items(estimate_id);
CREATE INDEX idx_invoices_tenant_id ON public.invoices(tenant_id);
CREATE INDEX idx_invoices_job_id ON public.invoices(job_id);
CREATE INDEX idx_invoices_contact_id ON public.invoices(contact_id);
CREATE INDEX idx_payments_tenant_id ON public.payments(tenant_id);
CREATE INDEX idx_payments_invoice_id ON public.payments(invoice_id);

-- Add triggers
CREATE TRIGGER update_catalog_items_updated_at BEFORE UPDATE ON public.catalog_items
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_estimates_updated_at BEFORE UPDATE ON public.estimates
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_estimate_items_updated_at BEFORE UPDATE ON public.estimate_items
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Enable RLS
ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimate_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage catalog items in their tenant" ON public.catalog_items
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage estimates in their tenant" ON public.estimates
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage estimate items in their tenant" ON public.estimate_items
  FOR ALL USING (
    estimate_id IN (
      SELECT id FROM public.estimates WHERE tenant_id IN (
        SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage invoices in their tenant" ON public.invoices
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage payments in their tenant" ON public.payments
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );