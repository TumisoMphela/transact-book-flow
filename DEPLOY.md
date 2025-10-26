# OutLook Tutoring - Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Supabase Setup](#supabase-setup)
3. [Email Configuration (SMTP)](#email-configuration-smtp)
4. [Stripe Setup](#stripe-setup)
5. [Vercel Deployment](#vercel-deployment)
6. [Post-Deployment Checklist](#post-deployment-checklist)

---

## Prerequisites

- Git repository with the project code
- Vercel account (free tier works)
- Supabase project (already created)
- Stripe account (test & live mode)
- Gmail account with app password (for SMTP)

---

## Supabase Setup

### 1. Database Migrations

All database migrations should already be applied. Verify by checking:
- Tables: `profiles`, `bookings`, `materials`, `availability`, etc.
- Views: `v_revenue_daily`, `v_bookings_daily`, `v_top_tutors`, `v_top_materials`
- RLS policies are enabled on all tables

### 2. Storage Buckets

Ensure the `materials` storage bucket exists:
- Go to Supabase Dashboard → Storage
- Verify `materials` bucket is public
- Check RLS policies for user access

### 3. Get Supabase Credentials

From Supabase Dashboard → Project Settings → API:
- Copy `Project URL` → This is your `VITE_SUPABASE_URL`
- Copy `anon public` key → This is your `VITE_SUPABASE_PUBLISHABLE_KEY`
- Copy `service_role` key → This is your `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

---

## Email Configuration (SMTP)

### Gmail App Password Setup

1. Go to Google Account Settings → Security
2. Enable 2-Factor Authentication
3. Go to App Passwords: https://myaccount.google.com/apppasswords
4. Generate new app password for "Mail"
5. Copy the 16-character password

### Configure Supabase SMTP

1. Go to Supabase Dashboard → Project Settings → Auth
2. Scroll to **SMTP Settings**
3. Configure:
   - **Enable Custom SMTP**: ON
   - **Sender email**: your-email@gmail.com
   - **Sender name**: OutLook Tutoring
   - **Host**: smtp.gmail.com
   - **Port number**: 587
   - **Username**: your-email@gmail.com
   - **Password**: [paste 16-character app password]
   - **TLS/STARTTLS**: Enable

### Add Email Templates

1. Go to Supabase Dashboard → Authentication → Email Templates
2. For each template (Confirm signup, Reset password):
   - Copy content from `docs/email-templates/verification.html`
   - Paste into Supabase template editor
   - Customize branding colors if needed
3. Save each template

---

## Stripe Setup

### 1. Get Stripe Keys

#### Test Mode:
1. Go to Stripe Dashboard → Developers → API Keys (test mode toggle ON)
2. Copy:
   - **Publishable key** → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - **Secret key** → `STRIPE_SECRET_KEY`

#### Webhook Secret:
1. Go to Developers → Webhooks
2. Add endpoint: `https://your-supabase-project.supabase.co/functions/v1/improved-stripe-webhook`
3. Select events: `checkout.session.completed`, `payment_intent.succeeded`
4. Copy **Signing secret** → `STRIPE_WEBHOOK_SECRET`
5. Add to Supabase Secrets:
   ```bash
   # In Supabase Dashboard → Edge Functions → Manage secrets
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

### 2. Test Mode → Live Mode Transition

When ready for production:
1. Switch Stripe dashboard to **Live mode**
2. Generate new **live** API keys
3. Create new **live** webhook endpoint
4. Update environment variables with live keys
5. Test thoroughly before going live

---

## Vercel Deployment

### 1. Connect Repository

1. Go to https://vercel.com
2. Click "Add New Project"
3. Import your Git repository
4. Select the project

### 2. Configure Environment Variables

Add these in Vercel → Project Settings → Environment Variables:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbG...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

**Do NOT add** these to Vercel (keep server-side only):
- `SUPABASE_SERVICE_ROLE_KEY` (only in Supabase edge functions)
- `STRIPE_SECRET_KEY` (only in Supabase edge functions)
- `STRIPE_WEBHOOK_SECRET` (only in Supabase edge functions)

### 3. Build Settings

- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 4. Deploy

1. Click "Deploy"
2. Wait for build to complete
3. Visit deployment URL

### 5. Custom Domain (Optional)

1. Go to Vercel → Project Settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed
4. Wait for SSL certificate provisioning
5. Update `NEXT_PUBLIC_APP_URL` to your custom domain

---

## Post-Deployment Checklist

### Security & Access
- [ ] Test user signup with email verification
- [ ] Verify RLS policies block unauthorized access
- [ ] Test admin dashboard access (admin role only)
- [ ] Verify Stripe webhook receiving events

### Features
- [ ] Test tutor availability CRUD
- [ ] Test student booking flow
- [ ] Test material upload & approval
- [ ] Test payment flow with Stripe test cards
- [ ] Verify analytics charts load
- [ ] Check audit log recording admin actions

### Performance
- [ ] Run Lighthouse audit (aim for 90+ performance)
- [ ] Check mobile responsiveness
- [ ] Test on different browsers (Chrome, Firefox, Safari)

### Database Optimization
- [ ] Verify indexes on frequently queried columns:
  ```sql
  CREATE INDEX IF NOT EXISTS idx_bookings_tutor ON bookings(tutor_id);
  CREATE INDEX IF NOT EXISTS idx_bookings_student ON bookings(student_id);
  CREATE INDEX IF NOT EXISTS idx_availability_tutor_day ON availability(tutor_id, day_of_week);
  CREATE INDEX IF NOT EXISTS idx_materials_tutor ON materials(tutor_id);
  CREATE INDEX IF NOT EXISTS idx_materials_status ON materials(approval_status);
  ```

### Monitoring
- [ ] Set up Supabase alerts for errors
- [ ] Monitor Stripe dashboard for payment issues
- [ ] Check Vercel analytics for traffic patterns
- [ ] Review Supabase logs for edge function errors

---

## Troubleshooting

### Email Not Sending
- Verify Gmail app password is correct
- Check SMTP settings in Supabase
- Test with `Test SMTP` button in Supabase
- Check spam folder

### Stripe Webhook Failing
- Verify webhook URL is correct
- Check Supabase edge function logs
- Ensure `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard
- Verify events are selected in Stripe webhook settings

### Database Errors
- Check RLS policies for the affected table
- Review Postgres logs in Supabase
- Verify user roles are correctly assigned

### Build Failures
- Check environment variables are set
- Review Vercel build logs
- Ensure all dependencies are in `package.json`

---

## Support

For issues:
1. Check Supabase logs: Dashboard → Logs
2. Check Vercel deployment logs
3. Review RUNBOOK.md for operational procedures
4. Contact support channels

---

**Last Updated**: 2025-10-18
**Version**: 1.0
