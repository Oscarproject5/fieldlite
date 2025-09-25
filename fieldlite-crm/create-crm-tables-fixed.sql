-- First, add user_id to contacts table if it doesn't exist
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update existing contacts to assign them to the current user (you may need to adjust this)
-- UPDATE contacts SET user_id = auth.uid() WHERE user_id IS NULL;

-- Create deals table
CREATE TABLE IF NOT EXISTS deals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  value DECIMAL(10, 2) DEFAULT 0,
  stage VARCHAR(50) DEFAULT 'lead',
  probability INTEGER DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
  expected_close_date DATE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create estimates table
CREATE TABLE IF NOT EXISTS estimates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  estimate_number VARCHAR(50) UNIQUE NOT NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  total DECIMAL(10, 2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'draft',
  valid_until DATE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  priority VARCHAR(20) DEFAULT 'medium',
  assigned_to UUID REFERENCES auth.users(id),
  location TEXT,
  scheduled_date TIMESTAMP WITH TIME ZONE,
  completed_date TIMESTAMP WITH TIME ZONE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  sku VARCHAR(100) UNIQUE,
  price DECIMAL(10, 2) DEFAULT 0,
  cost DECIMAL(10, 2) DEFAULT 0,
  quantity INTEGER DEFAULT 0,
  category VARCHAR(100),
  status VARCHAR(50) DEFAULT 'active',
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  total DECIMAL(10, 2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'draft',
  due_date DATE,
  paid_date DATE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Check if messages table exists and has correct structure
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add RLS policies for contacts if not already present
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own contacts" ON contacts;
CREATE POLICY "Users can view their own contacts" ON contacts
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can create their own contacts" ON contacts;
CREATE POLICY "Users can create their own contacts" ON contacts
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can update their own contacts" ON contacts;
CREATE POLICY "Users can update their own contacts" ON contacts
  FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can delete their own contacts" ON contacts;
CREATE POLICY "Users can delete their own contacts" ON contacts
  FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);

-- Add RLS policies for deals
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own deals" ON deals;
CREATE POLICY "Users can view their own deals" ON deals
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own deals" ON deals;
CREATE POLICY "Users can create their own deals" ON deals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own deals" ON deals;
CREATE POLICY "Users can update their own deals" ON deals
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own deals" ON deals;
CREATE POLICY "Users can delete their own deals" ON deals
  FOR DELETE USING (auth.uid() = user_id);

-- Add RLS policies for estimates
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own estimates" ON estimates;
CREATE POLICY "Users can view their own estimates" ON estimates
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own estimates" ON estimates;
CREATE POLICY "Users can create their own estimates" ON estimates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own estimates" ON estimates;
CREATE POLICY "Users can update their own estimates" ON estimates
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own estimates" ON estimates;
CREATE POLICY "Users can delete their own estimates" ON estimates
  FOR DELETE USING (auth.uid() = user_id);

-- Add RLS policies for jobs
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own jobs" ON jobs;
CREATE POLICY "Users can view their own jobs" ON jobs
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = assigned_to);

DROP POLICY IF EXISTS "Users can create their own jobs" ON jobs;
CREATE POLICY "Users can create their own jobs" ON jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own jobs" ON jobs;
CREATE POLICY "Users can update their own jobs" ON jobs
  FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = assigned_to);

DROP POLICY IF EXISTS "Users can delete their own jobs" ON jobs;
CREATE POLICY "Users can delete their own jobs" ON jobs
  FOR DELETE USING (auth.uid() = user_id);

-- Add RLS policies for products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own products" ON products;
CREATE POLICY "Users can view their own products" ON products
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own products" ON products;
CREATE POLICY "Users can create their own products" ON products
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own products" ON products;
CREATE POLICY "Users can update their own products" ON products
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own products" ON products;
CREATE POLICY "Users can delete their own products" ON products
  FOR DELETE USING (auth.uid() = user_id);

-- Add RLS policies for invoices
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own invoices" ON invoices;
CREATE POLICY "Users can view their own invoices" ON invoices
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own invoices" ON invoices;
CREATE POLICY "Users can create their own invoices" ON invoices
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own invoices" ON invoices;
CREATE POLICY "Users can update their own invoices" ON invoices
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own invoices" ON invoices;
CREATE POLICY "Users can delete their own invoices" ON invoices
  FOR DELETE USING (auth.uid() = user_id);

-- Add RLS policies for messages if not already present
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own messages" ON messages;
CREATE POLICY "Users can view their own messages" ON messages
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can create their own messages" ON messages;
CREATE POLICY "Users can create their own messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can update their own messages" ON messages;
CREATE POLICY "Users can update their own messages" ON messages
  FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;
CREATE POLICY "Users can delete their own messages" ON messages
  FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_deals_user_id ON deals(user_id);
CREATE INDEX IF NOT EXISTS idx_deals_contact_id ON deals(contact_id);
CREATE INDEX IF NOT EXISTS idx_estimates_user_id ON estimates(user_id);
CREATE INDEX IF NOT EXISTS idx_estimates_contact_id ON estimates(contact_id);
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_assigned_to ON jobs(assigned_to);
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_contact_id ON invoices(contact_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_contact_id ON messages(contact_id);