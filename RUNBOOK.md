# OutLook Tutoring - Operations Runbook

## Table of Contents
1. [Common Admin Operations](#common-admin-operations)
2. [Material Approval Workflow](#material-approval-workflow)
3. [Troubleshooting](#troubleshooting)
4. [Database Maintenance](#database-maintenance)
5. [Monitoring & Alerts](#monitoring--alerts)

## Common Admin Operations

### Approve/Reject Materials

**Via Admin Dashboard:**
1. Navigate to `/dashboard` and select "Material Approval" tab
2. Review material details and click "View" to inspect file
3. Click "Approve" or "Reject" with reason
4. All actions are logged in `admin_audit_log` table

**Via Database (emergency):**
```sql
-- Approve material
UPDATE materials 
SET approval_status = 'approved',
    approved_by = '<admin_user_id>',
    approved_at = NOW()
WHERE id = '<material_id>';

-- Reject material
UPDATE materials 
SET approval_status = 'rejected',
    rejection_reason = 'Reason here',
    approved_by = '<admin_user_id>',
    approved_at = NOW()
WHERE id = '<material_id>';
```

### Verify Tutors

**Via Admin Dashboard:**
1. Navigate to "Tutor Verification" tab
2. Review tutor profile, education, and credentials
3. Click "Verify" or "Unverify"

**Via Database:**
```sql
UPDATE profiles 
SET is_verified = true 
WHERE user_id = '<tutor_user_id>';
```

### Manage User Roles

**Add role to user:**
```sql
INSERT INTO user_roles (user_id, role, created_by)
VALUES ('<user_id>', 'admin', '<admin_user_id>');
```

**Remove role:**
```sql
DELETE FROM user_roles 
WHERE user_id = '<user_id>' AND role = 'admin';
```

**Check user roles:**
```sql
SELECT * FROM user_roles WHERE user_id = '<user_id>';
```

### Handle Refunds

1. Access Stripe Dashboard
2. Find payment via `stripe_session_id` from `payment_sessions` table
3. Issue refund in Stripe
4. Optionally update booking status:
```sql
UPDATE bookings 
SET status = 'cancelled',
    notes = COALESCE(notes, '') || ' - Refunded on ' || NOW()
WHERE id = '<booking_id>';
```

## Material Approval Workflow

### States
- `draft`: Tutor saved but not submitted (future feature)
- `pending`: Submitted, awaiting admin review
- `approved`: Visible in public library
- `rejected`: Not visible, tutor can see rejection reason

### Security Features
1. **Download tracking**: All downloads logged in `material_downloads`
2. **Purchase verification**: Paid materials require purchase record
3. **Secure URLs**: Edge function `secure-download` generates time-limited signed URLs (60s)

### Approval Checklist
- [ ] Content is educational and appropriate
- [ ] File type is valid (PDF, DOCX, PPTX)
- [ ] No copyright violations
- [ ] Pricing is reasonable for content
- [ ] File size is acceptable (<50MB)

## Troubleshooting

### Issue: User can't access protected route
**Check:**
1. User email is confirmed: `SELECT email_confirmed_at FROM profiles WHERE user_id = '<user_id>'`
2. User has correct role: `SELECT * FROM user_roles WHERE user_id = '<user_id>'`
3. Session is valid (check AuthContext state)

### Issue: Material upload fails
**Common causes:**
1. File size >50MB
2. Invalid file type
3. Storage bucket permissions
4. Network timeout

**Fix:**
```sql
-- Check storage quota
SELECT * FROM storage.buckets WHERE name = 'materials';

-- List recent uploads
SELECT * FROM storage.objects 
WHERE bucket_id = 'materials' 
ORDER BY created_at DESC LIMIT 10;
```

### Issue: Stripe webhook not processing
**Check:**
1. Webhook endpoint is reachable
2. Webhook signing secret is correct
3. Event already processed (idempotency):
```sql
SELECT * FROM stripe_events 
WHERE stripe_event_id = '<event_id>';
```

**Manually process:**
```sql
-- Mark as unprocessed to retry
UPDATE stripe_events 
SET processed = false, processed_at = NULL
WHERE stripe_event_id = '<event_id>';
```

### Issue: Download count not updating
**Fix:**
```sql
-- Recalculate from download logs
UPDATE materials m
SET download_count = (
  SELECT COUNT(*) 
  FROM material_downloads md 
  WHERE md.material_id = m.id
)
WHERE id = '<material_id>';
```

## Database Maintenance

### Check RLS Policies
```sql
-- List all policies
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### Audit Log Retention
```sql
-- Archive old audit logs (>90 days)
DELETE FROM admin_audit_log 
WHERE created_at < NOW() - INTERVAL '90 days';
```

### Clean Up Failed Sessions
```sql
-- Remove expired payment sessions
DELETE FROM payment_sessions 
WHERE payment_status = 'pending' 
  AND created_at < NOW() - INTERVAL '24 hours';
```

## Monitoring & Alerts

### Key Metrics to Monitor

**Daily Stats:**
```sql
-- New signups
SELECT COUNT(*) FROM profiles 
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Bookings today
SELECT COUNT(*), SUM(total_amount) 
FROM bookings 
WHERE session_date::date = CURRENT_DATE;

-- Materials pending approval
SELECT COUNT(*) FROM materials 
WHERE approval_status = 'pending';
```

**System Health:**
```sql
-- Failed webhook processing
SELECT COUNT(*) FROM stripe_events 
WHERE processed = false 
  AND created_at > NOW() - INTERVAL '1 hour';

-- Download errors (if tracking)
SELECT COUNT(*) FROM material_downloads 
WHERE downloaded_at > NOW() - INTERVAL '1 hour';
```

### Performance Indexes
All critical queries are indexed:
- `user_roles(user_id, role)`
- `materials(approval_status)`
- `bookings(status, session_date)`
- `material_downloads(material_id, user_id)`

### Backup Strategy
- Supabase handles automatic backups
- Consider exporting critical tables weekly
- Test restoration process quarterly

## Emergency Contacts
- **Supabase Support**: Via dashboard
- **Stripe Support**: dashboard.stripe.com/support
- **On-Call Admin**: [Configure as needed]

## Version
Last updated: 2025-10-09
Covers: Phase 1-4 implementation
