-- Contact activities for timeline tracking
create table if not exists public.contact_activities (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  activity_type text not null check (activity_type in ('call','email','sms','meeting','note','task')),
  activity_date timestamptz not null default timezone('utc', now()),
  subject text,
  description text,
  outcome text,
  duration integer,
  related_to_id uuid,
  related_to_type text,
  metadata jsonb,
  created_at timestamptz default timezone('utc', now()),
  created_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz default timezone('utc', now())
);

create index if not exists idx_contact_activities_contact_id on public.contact_activities(contact_id);
create index if not exists idx_contact_activities_tenant_id on public.contact_activities(tenant_id);
create index if not exists idx_contact_activities_activity_date on public.contact_activities(activity_date desc);

-- trigger to keep updated_at current
create or replace function public.set_contact_activity_updated_at()
returns trigger as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists contact_activities_set_updated_at on public.contact_activities;
create trigger contact_activities_set_updated_at
  before update on public.contact_activities
  for each row execute function public.set_contact_activity_updated_at();

alter table public.contact_activities enable row level security;

drop policy if exists "tenant can read contact activities" on public.contact_activities;
create policy "tenant can read contact activities"
  on public.contact_activities for select
  using (
    tenant_id = (
      select tenant_id from public.profiles where id = auth.uid()
    )
  );

drop policy if exists "tenant can insert contact activities" on public.contact_activities;
create policy "tenant can insert contact activities"
  on public.contact_activities for insert
  with check (
    tenant_id = (
      select tenant_id from public.profiles where id = auth.uid()
    )
  );

drop policy if exists "tenant can update contact activities" on public.contact_activities;
create policy "tenant can update contact activities"
  on public.contact_activities for update
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

drop policy if exists "tenant can delete contact activities" on public.contact_activities;
create policy "tenant can delete contact activities"
  on public.contact_activities for delete
  using (
    tenant_id = (
      select tenant_id from public.profiles where id = auth.uid()
    )
  );
