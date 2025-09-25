# FieldLite CRM - Setup Guide

## 🚨 Current Status
The application is built but needs a Supabase project to run properly. Follow these steps to get it working.

## Step 1: Create Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Click "New Project"
3. Fill in:
   - Project name: `fieldlite-crm` (or your preference)
   - Database Password: (save this securely)
   - Region: Choose closest to you
   - Plan: Free tier is fine for development

4. Wait for project to be created (takes ~2 minutes)

## Step 2: Run Database Migration

1. In Supabase Dashboard, go to **SQL Editor** (left sidebar)
2. Click **New query**
3. Copy ALL contents from `supabase/migrations/001_initial_schema.sql`
4. Paste into the SQL editor
5. Click **Run** (or press Ctrl+Enter)
6. You should see "Success. No rows returned"

## Step 3: Get Your API Keys

1. In Supabase Dashboard, go to **Settings** → **API** (left sidebar)
2. You'll find:
   - **Project URL**: Copy this (looks like `https://xxxxxxxxxxxxx.supabase.co`)
   - **anon public**: Copy this (under "Project API keys")
   - **service_role**: Click "Reveal" and copy (keep this secret!)

## Step 4: Update Environment Variables

1. Open `.env.local` in the fieldlite-crm folder
2. Replace the placeholder values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

## Step 5: Configure Authentication (Optional but Recommended)

### Disable Email Confirmation (for testing)
1. In Supabase Dashboard, go to **Authentication** → **Providers** → **Email**
2. Turn OFF "Confirm email"
3. Save changes

### Enable Google OAuth (Optional)
1. Go to **Authentication** → **Providers** → **Google**
2. Toggle to enable
3. Add your Google OAuth credentials:
   - Client ID
   - Client Secret
4. Add redirect URL to Google Console: `https://your-project.supabase.co/auth/v1/callback`

## Step 6: Restart the Development Server

1. Stop the current server (Ctrl+C in terminal)
2. Start it again:
```bash
npm run dev
```

## Step 7: Test the Application

1. Open [http://localhost:3000](http://localhost:3000)
2. You should be redirected to `/auth/login`
3. Click "Create account" to sign up
4. After signup, you'll be taken to the dashboard

## 🎉 Success Indicators

- ✅ Can access login page
- ✅ Can create an account
- ✅ Can log in
- ✅ Dashboard displays after login
- ✅ Sidebar navigation works

## 🔧 Troubleshooting

### "Invalid supabaseUrl" Error
- Make sure `.env.local` has the correct Supabase URL
- URL should start with `https://` and end with `.supabase.co`
- Restart the dev server after changing environment variables

### Can't Sign Up
- Check if email confirmation is disabled in Supabase
- Check browser console for errors
- Verify your anon key is correct

### Database Errors
- Make sure the migration ran successfully
- Check Supabase logs: Dashboard → Logs → Recent logs
- Verify RLS policies are created (check Database → Policies)

### Authentication Not Working
- Clear browser cookies/localStorage
- Check if user was created in Supabase (Authentication → Users)
- Verify middleware.ts is not blocking routes

## 📊 Quick Database Check

Run this in Supabase SQL Editor to verify setup:

```sql
-- Check if tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Should show: contacts, deals, estimates, invoices, jobs, etc.
```

## 🚀 Ready for Development!

Once everything is working:
1. Start building features (Phase 2: Contacts module)
2. The database schema is already complete
3. Authentication and multi-tenancy are ready
4. All you need to do is build the UI and API routes

## Need Help?

- Check Supabase logs for database errors
- Browser DevTools console for frontend errors
- Network tab to see API calls
- The README.md for more documentation