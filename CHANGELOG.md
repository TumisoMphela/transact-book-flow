# Changelog

All notable changes to the OUTLOOK Tutoring Platform will be documented in this file.

## [2.0.0] - 2025-10-02

### 🔐 Security Improvements (Phase 1)

#### Added
- **Role-Based Access Control (RBAC)**
  - Created `user_roles` table with separate role management
  - Implemented `app_role` enum with 'admin', 'tutor', and 'student' roles
  - Added security definer functions: `has_role()` and `get_user_roles()`
  - Prevents privilege escalation attacks by separating roles from user profiles

- **Admin Audit Logging**
  - New `admin_audit_log` table tracks all admin actions
  - Logs include: action type, target table, target ID, old/new data, and reason
  - Provides accountability and compliance tracking

- **Session History Tracking**
  - New `session_events` table tracks booking lifecycle events
  - Records status changes, who made changes, and notes
  - Enables complete booking history auditing

- **Enhanced RLS Policies**
  - Updated all tables to use role-based policies
  - Implemented least-privilege access patterns
  - Added admin override capabilities with proper logging

#### Security Enhancements
- Material approval workflow with `approval_status` field (draft/pending/approved/rejected)
- Rejection reason tracking for transparency
- Approved_by and approved_at timestamps for accountability
- Material downloads tracking table
- Stripe events idempotency table to prevent duplicate processing

#### Database Improvements
- Added performance indexes on frequently queried columns
- Implemented proper foreign key constraints
- Updated triggers to assign roles on user creation
- Enhanced data integrity with CHECK constraints

### 🎯 Core Features (Phase 2)

#### Material Management
- **Approval Workflow**
  - Materials now require admin approval before becoming visible
  - Tutors can upload materials in "pending" status
  - Admins can approve or reject with reasons
  - Email notifications for approval status changes

- **Secure Downloads**
  - Implemented `secure-download` edge function
  - Generates short-lived signed URLs (60-second expiry)
  - Tracks all downloads in `material_downloads` table
  - Validates purchases before allowing downloads

#### Payment Processing
- **Improved Webhook Handler**
  - Idempotent webhook processing using `stripe_events` table
  - Handles checkout.session.completed events
  - Updates payment_sessions and bookings automatically
  - Creates session_events for audit trail

- **Material Purchases**
  - Separate purchase flow for learning materials
  - Purchase tracking in `material_purchases` table
  - Integration with Stripe checkout sessions

### 👨‍💼 Admin Features (Phase 3)

#### Admin Dashboard Enhancements
- **Role-Based Access**
  - Dashboard now uses role system instead of profile check
  - Proper access denial with clear messaging
  - Audit logging for all admin actions

- **Material Approval Interface**
  - View all pending materials with tutor information
  - Preview materials before approval
  - Approve or reject with optional reason
  - Status badges for easy identification

- **Tutor Verification**
  - Enhanced verification interface
  - Tracks verification history
  - Audit logging for verification changes

#### Edge Functions
- **admin-approve-material**
  - Secure endpoint for material approval
  - Requires admin role verification
  - Creates audit log entries
  - Returns detailed success/error messages

- **improved-stripe-webhook**
  - Idempotent event processing
  - Handles multiple event types
  - Creates audit trails
  - Proper error handling and logging

- **secure-download**
  - Validates user authentication
  - Checks material purchase status
  - Generates time-limited URLs
  - Tracks download analytics

### 📚 Documentation (Phase 3)

#### Added Documentation
- **RUNBOOK.md**
  - Admin operations procedures
  - Material management workflows
  - Booking management guides
  - Payment operations
  - Troubleshooting guides
  - Key metrics and monitoring queries

- **CHANGELOG.md** (this file)
  - Comprehensive change tracking
  - Security improvements documentation
  - Feature additions
  - Migration guides

### 🔄 Updated Components

#### AuthContext
- Added roles state management
- Implemented `isAdmin`, `isTutor`, `isStudent` helpers
- Fetches user roles on authentication
- Clears roles on sign out

#### AdminDashboard
- Updated to use role-based authentication
- Enhanced material approval with status tracking
- Added approval_status badge colors
- Integrated audit logging

#### MaterialLibrary
- Updated to filter by `approval_status = 'approved'`
- Enhanced purchase validation
- Improved error handling

#### MaterialUpload
- Sets `approval_status = 'pending'` on upload
- Updated success message to indicate approval required
- Better user feedback

### 🏗️ Infrastructure

#### Performance
- Added database indexes on:
  - user_roles (user_id, role)
  - session_events (booking_id)
  - material_downloads (material_id, user_id)
  - materials (approval_status)
  - bookings (status, session_date)
  - stripe_events (stripe_event_id)

#### Database Functions
- `has_role()` - Secure role checking
- `get_user_roles()` - Retrieve user's roles array
- Updated `handle_new_user()` - Assigns roles on signup

### 🔧 Configuration

#### Supabase Functions
All edge functions are auto-deployed and include:
- CORS support for web requests
- Proper authentication checks
- Error handling and logging
- Idempotent operations where applicable

### ⚠️ Breaking Changes
- `user_type` field in profiles is now deprecated in favor of `user_roles` table
- `is_approved` field in materials replaced with `approval_status`
- Material visibility now strictly controlled by approval workflow
- Admin access now requires role in `user_roles` table

### 🔄 Migration Notes

#### For Existing Users
Existing users will have their roles automatically assigned based on their `user_type` via the updated `handle_new_user()` trigger.

To manually migrate existing users:
```sql
INSERT INTO user_roles (user_id, role)
SELECT user_id, user_type::app_role
FROM profiles
WHERE user_type IN ('admin', 'tutor', 'student')
ON CONFLICT (user_id, role) DO NOTHING;
```

#### For Existing Materials
Existing materials need approval status migration:
```sql
UPDATE materials
SET approval_status = CASE
  WHEN is_approved = true THEN 'approved'
  ELSE 'pending'
END
WHERE approval_status IS NULL;
```

### 📊 Platform Warnings
Two platform-level security recommendations from Supabase:
1. **Enable leaked password protection** in Auth settings
2. **Upgrade Postgres version** for latest security patches

These are not critical but should be addressed in the Supabase dashboard.

### 🎯 Next Steps (Phase 4 - Future)
- [ ] Implement comprehensive test suite
- [ ] Add E2E testing with Playwright/Cypress
- [ ] Set up CI/CD pipeline
- [ ] Add rate limiting on API endpoints
- [ ] Implement caching for frequently accessed data
- [ ] Add email notifications for material approval
- [ ] Create analytics dashboard
- [ ] Add bulk operations for admins
- [ ] Implement search optimization
- [ ] Add real-time notifications

---

## Version History
- **2.0.0** - Major security and feature overhaul with RBAC
- **1.0.0** - Initial release with basic tutoring platform features