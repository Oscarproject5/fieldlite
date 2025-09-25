-- Companies master data for contact linkage
create table if not exists public.companies (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  industry text,
  size text,
  website text,
  phone text,
  email text,
  address jsonb,
  logo_url text,
  notes text,
  annual_revenue numeric,
  employee_count integer,
  tags text[],
  custom_fields jsonb,
  created_at timestamptz default timezone('utc', now()),
  updated_at timestamptz default timezone('utc', now())
);

alter table public.contacts
  add column if not exists company_id uuid references public.companies(id) on delete set null;

create index if not exists idx_companies_tenant_id on public.companies(tenant_id);
create index if not exists idx_contacts_company_id on public.contacts(company_id);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists companies_set_updated_at on public.companies;
create trigger companies_set_updated_at
  before update on public.companies
  for each row execute function public.set_updated_at();

alter table public.companies enable row level security;

drop policy if exists "tenant can read companies" on public.companies;
create policy "tenant can read companies"
  on public.companies for select
  using (
    tenant_id = (
      select tenant_id from public.profiles where id = auth.uid()
    )
  );

drop policy if exists "tenant can insert companies" on public.companies;
create policy "tenant can insert companies"
  on public.companies for insert
  with check (
    tenant_id = (
      select tenant_id from public.profiles where id = auth.uid()
    )
  );

drop policy if exists "tenant can update companies" on public.companies;
create policy "tenant can update companies"
  on public.companies for update
  using (
    tenant_id = (
      select tenant_id from public.profiles where id = auth.uid()
    )
  )
  with check (
    tenant_id = (
      select tenant_id from public.profiles where id = auth.uid()
    )
  );

drop policy if exists "tenant can delete companies" on public.companies;
create policy "tenant can delete companies"
  on public.companies for delete
  using (
    tenant_id = (
      select tenant_id from public.profiles where id = auth.uid()
    )
  );
