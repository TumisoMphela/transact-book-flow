# OutLook Tutoring - Full Production Deployment Guide

## Overview
This guide covers deploying the complete OutLook Tutoring platform with all features:
- ✅ Stripe Connect for tutor/student payouts
- ✅ Earnings tracking and payout management
- ✅ Demo video uploads and admin approval
- ✅ LMS enhancement with quizzes
- ✅ Enhanced messaging with media support
- ✅ Subject management
- ✅ Home page with feature sections

## Prerequisites

1. **Supabase Project**
   - Active Supabase project
   - Project ID and API keys
   - Database migrations applied

2. **Stripe Account**
   - Stripe account in test/live mode
   - Connect Express enabled
   - API keys ready

3. **Email Service (Optional)**
   - Resend API key for transactional emails
   - OR Gmail SMTP configured

## Step 1: Database Setup

The database migrations have already been applied. Verify tables exist:

```sql
-- Check new tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('connect_accounts', 'earnings', 'lesson_quizzes');
```

## Step 2: Storage Buckets

Create the required storage bucket for chat media:

```sql
-- Create chat-media bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', false);

-- Create RLS policies for chat-media
CREATE POLICY "Authenticated users can upload chat media"
ON storage.objects FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'chat-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own chat media"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'chat-media' AND auth.uid()::text = (storage.foldername(name))[1]);
```

## Step 3: Stripe Connect Setup

1. **Enable Stripe Connect**
   - Go to https://dashboard.stripe.com/connect/accounts/overview
   - Click "Get Started" if not already enabled
   - Choose "Express" account type

2. **Get Connect Client ID**
   - Navigate to Settings → Connect → Settings
   - Copy your Connect Client ID
   - Add to environment variables as `STRIPE_CONNECT_CLIENT_ID`

3. **Configure Webhooks**
   - Go to Developers → Webhooks
   - Add endpoint: `https://your-project.supabase.co/functions/v1/improved-stripe-webhook`
   - Select events:
     - `account.updated`
     - `checkout.session.completed`
     - `payment_intent.succeeded`
     - `transfer.created`
   - Copy webhook signing secret

## Step 4: Environment Variables

Update your `.env` file (or Vercel/hosting environment):

```env
# Supabase
VITE_SUPABASE_URL=https://otoylapoqdhodmuydkor.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbG...
VITE_SUPABASE_PROJECT_ID=otoylapoqdhodmuydkor

# Stripe
STRIPE_SECRET_KEY=sk_live_... or sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CONNECT_CLIENT_ID=ca_...
PLATFORM_FEE_PERCENT=10

# Email (Resend)
RESEND_API_KEY=re_...

# App
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## Step 5: Edge Functions Configuration

The following edge functions are now deployed:

1. **stripe-connect-onboard**: Creates Stripe Connect accounts
2. **payout**: Processes tutor/student payouts
3. **chat-upload-signed-url**: Generates signed URLs for chat media
4. **improved-stripe-webhook**: Handles Stripe webhook events

Verify deployment in Supabase Dashboard → Edge Functions.

## Step 6: Test the Platform

### 6.1 Test Stripe Connect Onboarding

1. Sign up as a tutor/student
2. Navigate to `/dashboard/earnings`
3. Click "Complete Setup"
4. Complete Stripe Express onboarding
5. Verify `connect_accounts` table has your record

### 6.2 Test Earnings Flow

1. Purchase a material or book a session (as student)
2. Check `earnings` table for new record
3. As the seller, go to `/dashboard/earnings`
4. Verify balance shows correctly
5. Click "Request Payout" (if balance > R20)

### 6.3 Test Demo Upload & Approval

1. As tutor, upload demo video at `/dashboard/demo-upload`
2. As admin, go to `/admin/demos`
3. Approve or reject the demo
4. Verify demo appears on tutor profile

### 6.4 Test Chat Media Upload

1. Join a study group
2. Try uploading an image/PDF in chat
3. Verify media displays correctly
4. Check `chat-media` bucket in Storage

## Step 7: Production Checklist

- [ ] Switch Stripe to live mode
- [ ] Update Stripe webhook URL to production
- [ ] Configure custom domain
- [ ] Enable SSL/HTTPS
- [ ] Set up monitoring and logging
- [ ] Test email notifications
- [ ] Review RLS policies for security
- [ ] Set up automated backups
- [ ] Configure rate limiting
- [ ] Add error tracking (e.g., Sentry)

## Step 8: Security Hardening

1. **Review RLS Policies**
   ```sql
   -- Verify all tables have RLS enabled
   SELECT tablename FROM pg_tables 
   WHERE schemaname = 'public' 
   AND rowsecurity = false;
   ```

2. **Audit Admin Functions**
   - Only `admin_approve_demo` should use `SECURITY DEFINER`
   - All should include `SET search_path = public`

3. **Check Storage Policies**
   - Ensure users can only access their own uploaded files
   - Signed URLs expire within 1 hour

4. **API Key Rotation**
   - Rotate Stripe keys quarterly
   - Rotate Supabase service role key annually

## Troubleshooting

### Stripe Connect Issues

**Error: "Account not found"**
- Verify `STRIPE_CONNECT_CLIENT_ID` is correct
- Check Stripe Connect is enabled in dashboard

**Error: "Onboarding incomplete"**
- User needs to complete all Stripe Express steps
- Check `onboarding_complete` field in `connect_accounts`

### Payout Issues

**Error: "Minimum payout not met"**
- Minimum is R20.00
- Check `pendingEarnings` calculation

**Error: "Transfer failed"**
- Verify recipient's Stripe account is active
- Check Stripe dashboard for detailed error

### Chat Media Upload

**Error: "File too large"**
- Max size is 25MB
- Check client-side validation

**Error: "Signed URL expired"**
- Signed URLs valid for 1 hour
- Re-request upload URL

## Performance Optimization

1. **Database Indexing**
   - Already indexed: `earnings(user_id, is_paid)`
   - Already indexed: `subjects(is_approved)`

2. **Edge Function Optimization**
   - Functions use background tasks where appropriate
   - Implement caching for frequently accessed data

3. **Storage Optimization**
   - Consider CDN for frequently accessed media
   - Implement image compression for uploads

## Monitoring

Set up alerts for:
- Failed payments
- Payout errors
- Storage bucket quota (80% full)
- Database connection pool exhaustion
- Edge function errors (> 5% error rate)

## Support & Maintenance

- Monitor Stripe Dashboard daily for issues
- Review edge function logs weekly
- Check database performance metrics monthly
- Update dependencies quarterly

## Additional Resources

- [Stripe Connect Documentation](https://stripe.com/docs/connect)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Storage](https://supabase.com/docs/guides/storage)
- [RLS Best Practices](https://supabase.com/docs/guides/auth/row-level-security)

---

**Last Updated**: 2025-11-11  
**Version**: 2.0 (Production Upgrade Complete)
