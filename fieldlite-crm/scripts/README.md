# Scripts Directory

This directory contains utility scripts for database operations and data seeding.

## Available Scripts

### Database Schema
- `extract-full-schema.sql` - SQL queries to extract complete database schema from Supabase

### Data Seeding
- `seed-messages-complete.sql` - Complete seed data for messages table with sample conversations
- `seed-messages-direct.js` - Node.js script to seed messages directly via Supabase client

## Usage

### Extract Schema from Supabase
Run the SQL in `extract-full-schema.sql` directly in your Supabase SQL Editor to get:
- Table definitions with columns
- Foreign key relationships
- Indexes and constraints
- RLS policies
- Functions and triggers

### Seed Sample Data
```bash
# Using Node.js
node seed-messages-direct.js

# Or run seed-messages-complete.sql in Supabase SQL Editor
```

## Notes
- The complete database schema is maintained at `/fieldlite-crm/complete-schema.sql`
- Migration files are in `/fieldlite-crm/supabase/migrations/`
- Always backup your database before running seed scripts in production