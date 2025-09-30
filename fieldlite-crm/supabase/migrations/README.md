# FieldLite CRM Database Migrations

This directory contains the database migration files for FieldLite CRM.

## Migration Structure

Migrations are numbered sequentially and organized by feature area:

- `00001_initial_schema.sql` - Base tables and setup (tenants, profiles, companies, contacts)
- `00002_crm_features.sql` - CRM functionality (deals, activities, notes)
- `00003_job_management.sql` - Job management system (jobs, tasks, time logs)
- `00004_communication.sql` - Communication features (calls, messages, Twilio integration)
- `00005_financial.sql` - Financial management (estimates, invoices, payments)
- `00006_utility_tables.sql` - Utility and support tables (audit logs, files, products)

## Complete Schema

For a complete view of the database schema, see `../schema.sql`

## Running Migrations

### Option 1: Using Supabase CLI
```bash
supabase db push
```

### Option 2: Manual Execution
Run each migration file in sequence through the Supabase SQL editor or psql:

```bash
psql -h <host> -U <user> -d <database> -f 00001_initial_schema.sql
psql -h <host> -U <user> -d <database> -f 00002_crm_features.sql
# ... continue for all migrations
```

### Option 3: Single Schema File
For fresh installations, you can use the complete schema file:

```bash
psql -h <host> -U <user> -d <database> -f ../schema.sql
```

## Important Notes

1. **Order Matters**: Always run migrations in sequential order
2. **Idempotency**: Migrations include IF NOT EXISTS clauses where appropriate
3. **RLS Policies**: Row Level Security is enabled on all tables with basic tenant isolation
4. **Custom Types**: Custom ENUM types are created for various status fields
5. **Triggers**: Updated_at timestamps are automatically managed via triggers

## Adding New Migrations

When creating a new migration:

1. Use the next sequential number (e.g., `00007_feature_name.sql`)
2. Include a header comment with migration name, description, and date
3. Make migrations idempotent when possible
4. Include relevant indexes for performance
5. Add RLS policies for new tables
6. Update this README with the new migration description