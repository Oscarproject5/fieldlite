# FieldLite CRM

A modern CRM solution for local service businesses built with Next.js 15, Supabase, and TypeScript.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (free tier works)
- Stripe account (for payments)

### Setup Instructions

1. **Clone and Install Dependencies**
```bash
cd fieldlite-crm
npm install
```

2. **Set up Supabase**

   a. Create a new Supabase project at [https://app.supabase.com](https://app.supabase.com)

   b. Go to the SQL Editor in your Supabase dashboard

   c. Run the migration script from `supabase/migrations/001_initial_schema.sql`

   d. Enable Google OAuth (optional):
      - Go to Authentication → Providers
      - Enable Google provider
      - Add your Google OAuth credentials

3. **Configure Environment Variables**

   Copy the environment variables from your Supabase project:

   - Go to Settings → API in Supabase dashboard
   - Update `.env.local` with your values:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

4. **Run the Development Server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## 📁 Project Structure

```
fieldlite-crm/
├── app/                    # Next.js 15 app directory
│   ├── auth/              # Authentication pages
│   │   ├── login/
│   │   └── signup/
│   ├── dashboard/         # Main dashboard
│   └── (other routes)/
├── components/            # React components
│   └── dashboard/        # Dashboard-specific components
├── lib/                   # Utilities and configurations
│   └── supabase/         # Supabase client setup
├── supabase/             # Database migrations
│   └── migrations/
└── middleware.ts         # Auth middleware
```

## 🔐 Authentication Flow

1. Users sign up with email/password or Google OAuth
2. Creates a tenant and profile in the database
3. All data is isolated by tenant using Row Level Security
4. Session management handled by Supabase Auth

## 🗄️ Database Schema

The database includes:
- Multi-tenant architecture with RLS
- Contacts (leads, customers, vendors)
- Deals/Opportunities pipeline
- Estimates and line items
- Jobs and scheduling
- Invoicing and payments
- Time tracking
- Messaging system
- Audit logs

## 🎯 Current Features

### Phase 1 ✅ (Foundation)
- [x] Next.js 15 with TypeScript setup
- [x] Supabase integration
- [x] Multi-tenant database schema
- [x] Authentication (email/password + Google OAuth)
- [x] Basic dashboard layout
- [x] Row Level Security policies

### Next Steps (Phase 2)
- [ ] Contacts module (CRUD operations)
- [ ] Deals pipeline with Kanban view
- [ ] Catalog/pricebook system
- [ ] Lead capture webhooks

## 🚦 Development Workflow

1. **Start development server:**
```bash
npm run dev
```

2. **Build for production:**
```bash
npm run build
```

3. **Run production build:**
```bash
npm start
```

## 🔧 Tech Stack

- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend:** Supabase (PostgreSQL, Auth, Realtime, Storage)
- **Authentication:** Supabase Auth
- **Payments:** Stripe (to be integrated)
- **Forms:** React Hook Form + Zod validation
- **Icons:** Lucide React
- **State:** Zustand

## 📝 Environment Variables

Required environment variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe (Phase 5)
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# Twilio (Phase 6)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# SendGrid (Phase 6)
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

## 🛠️ Troubleshooting

### Common Issues

1. **Authentication not working:**
   - Verify Supabase URL and anon key in `.env.local`
   - Check if RLS policies are applied correctly
   - Ensure email confirmations are disabled for testing

2. **Database queries failing:**
   - Check if migrations ran successfully
   - Verify RLS policies match your user's tenant
   - Check Supabase dashboard for error logs

3. **Build errors:**
   - Clear `.next` folder and rebuild
   - Update dependencies: `npm update`
   - Check TypeScript errors: `npm run type-check`

## 📚 Documentation

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [React Hook Form](https://react-hook-form.com/)

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is proprietary software. All rights reserved.
