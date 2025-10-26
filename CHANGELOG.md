# Changelog

All notable changes to the OutLook Tutoring platform.

## [2.0.0] - 2025-10-09

### 🔐 Security (Phase 1)

#### Added
- **Role-Based Access Control (RBAC)**
  - Created `app_role` enum type with `admin`, `tutor`, `student` roles
  - New `user_roles` table with unique role assignments per user
  - Security definer functions: `has_role()` and `get_user_roles()`
  - Integrated roles into AuthContext with `isAdmin`, `isTutor`, `isStudent` helpers

- **Admin Audit Logging**
  - New `admin_audit_log` table tracking all admin actions
  - Captures: action type, target table/id, old/new data, reason, timestamp
  - RLS policies: admins can read, system can insert

- **Session Event Tracking**
  - New `session_events` table for booking lifecycle history
  - Tracks: status changes, who made changes, notes, timestamps
  - Provides audit trail for disputes and analytics

- **Material Approval Workflow**
  - Added `approval_status` enum: draft, pending, approved, rejected
  - Added `rejection_reason`, `approved_by`, `approved_at` columns to materials
  - Replaced `is_approved` boolean with granular status tracking
  - Materials must be `approved` to appear in public library

- **Download & Purchase Tracking**
  - New `material_downloads` table logging each download
  - Tracks: material_id, user_id, timestamp
  - Enables analytics and abuse detection

- **Stripe Webhook Idempotency**
  - New `stripe_events` table with unique `stripe_event_id`
  - Prevents duplicate payment processing on webhook retries
  - Stores full payload for debugging

#### Changed
- **Updated RLS Policies** - All tables now use role-based access:
  - `profiles`: Admins can update any profile
  - `bookings`: Students create, participants + admins update/view
  - `materials`: Tutors manage own, admins manage all, public sees approved only
  - `reviews`: Students review completed bookings only
  - `user_roles`: Users view own, admins manage all

- **AuthContext Enhancement**
  - Added role fetching via `user_roles` table
  - Exposed `roles`, `isAdmin`, `isTutor`, `isStudent` flags
  - Integrated with profile fetch for single auth state

- **Admin Dashboard**
  - Now uses `isAdmin` flag instead of `profile.user_type`
  - Material approval shows status badges (pending/approved/rejected)
  - Actions logged to `admin_audit_log`
  - Conditional UI based on `approval_status`

#### Performance
- Added indexes on:
  - `user_roles(user_id, role)`
  - `session_events(booking_id)`
  - `material_downloads(material_id, user_id)`
  - `materials(approval_status)`
  - `bookings(status, session_date)`
  - `stripe_events(stripe_event_id)`

### 📦 Features (Phase 2-3)

#### Added
- **Secure Download System** (Edge Function)
  - `secure-download` function generates time-limited signed URLs (60s expiry)
  - Verifies: authentication, material approval, purchase (if paid), ownership
  - Logs download and increments counter atomically
  - Returns: `{ download_url, expires_in }`

- **Material Approval API** (Edge Function)
  - `admin-approve-material` function for programmatic approval/rejection
  - Validates admin role using RLS bypass with service key
  - Logs action to `admin_audit_log`
  - Returns: updated material with status

- **Enhanced Stripe Webhook** (Edge Function)
  - `improved-stripe-webhook` with idempotency check
  - Processes: `checkout.session.completed`, `payment_intent.succeeded`
  - Updates `payment_sessions` and `bookings` tables
  - Stores event in `stripe_events` for audit

- **Material Purchase Flow**
  - MaterialLibrary component checks purchase status
  - Shows "Purchase $X.XX" or "Download" based on ownership
  - Integrates with `create-checkout` function
  - Tracks purchases in `material_purchases` table

#### Changed
- **MaterialLibrary**
  - Filters materials by `approval_status = 'approved'`
  - Removed `is_approved` boolean checks
  - Shows purchase button for unpurchased paid materials

- **MaterialUpload**
  - Sets `approval_status: 'pending'` on new uploads
  - Updated success message: "submitted for approval"
  - Tutors see own materials regardless of status

### 📚 Documentation (Phase 4)

#### Added
- **RUNBOOK.md** - Operations manual covering:
  - Common admin operations (approve materials, verify tutors, manage roles)
  - Material approval workflow and security features
  - Troubleshooting guides (auth, uploads, webhooks)
  - Database maintenance queries
  - Monitoring metrics and health checks
  - Emergency procedures

- **CHANGELOG.md** - This file tracking all changes

### 🔧 Technical

#### Database Schema Changes
```sql
-- New tables
CREATE TABLE user_roles (...);
CREATE TABLE admin_audit_log (...);
CREATE TABLE session_events (...);
CREATE TABLE material_downloads (...);
CREATE TABLE stripe_events (...);

-- Altered tables
ALTER TABLE materials 
  ADD approval_status, rejection_reason, approved_by, approved_at;

-- New functions
CREATE FUNCTION has_role(_user_id, _role);
CREATE FUNCTION get_user_roles(_user_id);

-- Updated trigger
CREATE FUNCTION handle_new_user() -- now assigns role
```

#### Edge Functions
- `admin-approve-material` - Material approval API
- `secure-download` - Secure download with time-limited URLs
- `improved-stripe-webhook` - Idempotent webhook processing

### 🚨 Breaking Changes

1. **Material Approval**
   - `is_approved` column deprecated (kept for backwards compat)
   - Use `approval_status` instead
   - Existing approved materials migration:
   ```sql
   UPDATE materials 
   SET approval_status = 'approved' 
   WHERE is_approved = true AND approval_status IS NULL;
   ```

2. **Admin Checks**
   - Replace `profile.user_type === 'admin'` with `useAuth().isAdmin`
   - Admin status now checked via `user_roles` table + RLS

3. **Download Flow**
   - Direct file URL access should use `secure-download` function
   - Enforces purchase verification and generates signed URLs

### 🔄 Migration Notes

**For existing installations:**

1. Run Phase 1 migration SQL (creates tables, functions, RLS)
2. Assign admin role to first user:
   ```sql
   INSERT INTO user_roles (user_id, role) 
   VALUES ('<your-user-id>', 'admin');
   ```
3. Migrate existing material approvals:
   ```sql
   UPDATE materials 
   SET approval_status = CASE 
     WHEN is_approved THEN 'approved' 
     ELSE 'pending' 
   END
   WHERE approval_status IS NULL;
   ```
4. Update frontend code to use new role system
5. Deploy edge functions
6. Configure Stripe webhook to use `improved-stripe-webhook`

### 📈 Next Steps

**Recommended future enhancements:**
- [ ] Email notifications for material approval/rejection
- [ ] Tutor dashboard for material analytics
- [ ] Bulk material approval interface
- [ ] Automated content moderation (AI-powered)
- [ ] Material versioning and updates
- [ ] Advanced search with full-text indexing
- [ ] Rate limiting on downloads
- [ ] Material collections/bundles
- [ ] Review moderation system
- [ ] Booking reminders and notifications

---

## [1.0.0] - Prior to 2025-10-09

### Initial Implementation
- User authentication (email/password)
- Profile management (students & tutors)
- Booking system
- Material upload/download
- Basic admin dashboard
- Stripe payment integration
- Messaging system
- Review system
