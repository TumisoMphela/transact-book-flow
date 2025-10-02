# OUTLOOK Tutoring Platform - Operations Runbook

## Overview
This runbook contains common operational procedures for the OUTLOOK Tutoring platform.

## Table of Contents
1. [Admin Operations](#admin-operations)
2. [Material Management](#material-management)
3. [Booking Management](#booking-management)
4. [Payment Operations](#payment-operations)
5. [User Management](#user-management)
6. [Troubleshooting](#troubleshooting)

---

## Admin Operations

### Granting Admin Access
To grant admin access to a user:

```sql
-- Get the user's ID first
SELECT id, email FROM auth.users WHERE email = 'user@example.com';

-- Add admin role
INSERT INTO public.user_roles (user_id, role, created_by)
VALUES ('user-uuid-here', 'admin', 'your-admin-uuid');
```

### Viewing Audit Logs
```sql
SELECT 
  aal.created_at,
  u.email as admin_email,
  aal.action,
  aal.target_table,
  aal.reason
FROM admin_audit_log aal
JOIN auth.users u ON u.id = aal.admin_id
ORDER BY aal.created_at DESC
LIMIT 50;
```

---

## Material Management

### Approving a Material
1. Navigate to Admin Dashboard → Material Approval tab
2. Click "View" to review the material
3. Click "Approve" to approve or "Reject" to reject
4. If rejecting, provide a reason

Or via SQL:
```sql
UPDATE public.materials
SET 
  approval_status = 'approved',
  approved_by = 'admin-user-id',
  approved_at = NOW()
WHERE id = 'material-id';
```

### Bulk Approve Materials from a Trusted Tutor
```sql
UPDATE public.materials
SET 
  approval_status = 'approved',
  approved_by = 'admin-user-id',
  approved_at = NOW()
WHERE tutor_id = 'tutor-user-id' 
  AND approval_status = 'pending';
```

### View Pending Materials
```sql
SELECT 
  m.id,
  m.title,
  m.subject,
  m.created_at,
  p.first_name || ' ' || p.last_name as tutor_name
FROM materials m
JOIN profiles p ON p.user_id = m.tutor_id
WHERE m.approval_status = 'pending'
ORDER BY m.created_at ASC;
```

---

## Booking Management

### View Booking History for a User
```sql
SELECT 
  b.id,
  b.session_date,
  b.status,
  b.total_amount,
  tutor.first_name || ' ' || tutor.last_name as tutor_name,
  student.first_name || ' ' || student.last_name as student_name
FROM bookings b
JOIN profiles tutor ON tutor.user_id = b.tutor_id
JOIN profiles student ON student.user_id = b.student_id
WHERE b.student_id = 'user-id' OR b.tutor_id = 'user-id'
ORDER BY b.session_date DESC;
```

### Cancel a Booking
```sql
UPDATE bookings
SET status = 'cancelled'
WHERE id = 'booking-id';

-- Log the event
INSERT INTO session_events (booking_id, event_type, old_status, new_status, notes)
VALUES ('booking-id', 'admin_cancelled', 'previous-status', 'cancelled', 'Cancelled by admin');
```

### View All Completed Sessions
```sql
SELECT 
  b.id,
  b.session_date,
  b.total_amount,
  b.subject,
  tutor.first_name || ' ' || tutor.last_name as tutor_name
FROM bookings b
JOIN profiles tutor ON tutor.user_id = b.tutor_id
WHERE b.status = 'completed'
ORDER BY b.session_date DESC;
```

---

## Payment Operations

### Process a Manual Refund
1. **Issue refund in Stripe Dashboard** first
2. Then update the database:

```sql
-- Update payment session
UPDATE payment_sessions
SET payment_status = 'refunded'
WHERE stripe_session_id = 'stripe-session-id';

-- Update booking status
UPDATE bookings
SET status = 'cancelled'
WHERE id = (
  SELECT booking_id 
  FROM payment_sessions 
  WHERE stripe_session_id = 'stripe-session-id'
);

-- Log the event
INSERT INTO session_events (booking_id, event_type, old_status, new_status, notes)
SELECT 
  booking_id,
  'refund_processed',
  'confirmed',
  'cancelled',
  'Refund processed by admin'
FROM payment_sessions
WHERE stripe_session_id = 'stripe-session-id';
```

### View Failed Payments
```sql
SELECT 
  ps.id,
  ps.created_at,
  ps.payment_status,
  ps.stripe_session_id,
  b.student_id,
  p.email
FROM payment_sessions ps
JOIN bookings b ON b.id = ps.booking_id
JOIN auth.users p ON p.id = b.student_id
WHERE ps.payment_status = 'failed'
ORDER BY ps.created_at DESC;
```

### Check Stripe Webhook Status
```sql
SELECT 
  stripe_event_id,
  event_type,
  processed,
  created_at,
  processed_at
FROM stripe_events
ORDER BY created_at DESC
LIMIT 20;
```

---

## User Management

### Verify a Tutor
```sql
UPDATE profiles
SET is_verified = true
WHERE user_id = 'tutor-user-id';
```

### View User Roles
```sql
SELECT 
  u.email,
  ARRAY_AGG(ur.role) as roles,
  p.first_name,
  p.last_name
FROM auth.users u
LEFT JOIN user_roles ur ON ur.user_id = u.id
LEFT JOIN profiles p ON p.user_id = u.id
GROUP BY u.id, u.email, p.first_name, p.last_name
ORDER BY u.email;
```

### Disable a User Account
```sql
-- This requires accessing Supabase Auth dashboard
-- Go to Authentication → Users → Select user → Disable
```

---

## Troubleshooting

### Webhook Not Processing
1. Check Stripe webhook logs in Stripe Dashboard
2. Verify webhook secret is correct:
   ```bash
   supabase secrets list
   ```
3. Check edge function logs:
   ```bash
   supabase functions logs improved-stripe-webhook
   ```
4. Manually reprocess failed webhook:
   ```sql
   UPDATE stripe_events
   SET processed = false
   WHERE stripe_event_id = 'evt_xxx';
   ```

### Material Not Showing After Approval
1. Check approval status:
   ```sql
   SELECT id, title, approval_status, approved_at
   FROM materials
   WHERE id = 'material-id';
   ```
2. Verify RLS policies allow access
3. Check frontend filters

### Booking Stuck in Pending
1. Check payment status:
   ```sql
   SELECT ps.payment_status, ps.stripe_session_id, b.status
   FROM bookings b
   LEFT JOIN payment_sessions ps ON ps.booking_id = b.id
   WHERE b.id = 'booking-id';
   ```
2. Check Stripe session in Stripe Dashboard
3. Manually update if payment succeeded:
   ```sql
   UPDATE bookings SET status = 'confirmed' WHERE id = 'booking-id';
   ```

### User Can't Download Purchased Material
1. Verify purchase exists:
   ```sql
   SELECT * FROM material_purchases
   WHERE material_id = 'material-id' AND student_id = 'user-id';
   ```
2. Check material approval status
3. Verify secure-download edge function is working

---

## Monitoring

### Key Metrics to Monitor
```sql
-- Daily signups
SELECT DATE(created_at), COUNT(*) 
FROM auth.users 
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at);

-- Revenue by day
SELECT DATE(created_at), SUM(amount_paid) 
FROM payment_sessions 
WHERE payment_status = 'paid' 
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at);

-- Active tutors (with at least one booking)
SELECT COUNT(DISTINCT tutor_id)
FROM bookings
WHERE session_date >= NOW() - INTERVAL '30 days';
```

---

## Emergency Contacts
- **Technical Issues**: Check edge function logs and database logs
- **Payment Issues**: Check Stripe Dashboard first
- **User Reports**: Check admin_audit_log for recent changes

## Backup Procedures
Regular backups are handled automatically by Supabase. To create a manual backup:
1. Go to Supabase Dashboard → Database → Backups
2. Click "Create Backup"
3. Download if needed for migration purposes