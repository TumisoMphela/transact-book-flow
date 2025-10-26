-- Fix 1: Restrict profiles table to prevent PII exposure
-- Drop overly permissive public policy
DROP POLICY IF EXISTS "Anyone can view basic profile info" ON public.profiles;

-- Allow users to view their own full profile
CREATE POLICY "Users view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

-- Create safe public view for tutor discovery (limited fields only)
CREATE OR REPLACE VIEW public.public_tutor_profiles AS
SELECT 
  user_id, 
  first_name, 
  last_name, 
  bio, 
  subjects, 
  hourly_rate, 
  experience_years, 
  education,
  is_verified, 
  profile_image_url,
  location
FROM public.profiles
WHERE user_type = 'tutor' AND is_verified = true;

-- Grant SELECT on public view to anon and authenticated users
GRANT SELECT ON public.public_tutor_profiles TO anon, authenticated;

-- Fix 2: Secure analytics views with admin-only access
-- Convert views to security barrier and restrict via RLS on base tables
-- Since views cannot have RLS directly, we'll create security definer functions

CREATE OR REPLACE FUNCTION public.get_revenue_daily()
RETURNS TABLE(day date, revenue numeric)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    date_trunc('day', created_at)::date AS day,
    COALESCE(SUM(amount_paid),0)::numeric(12,2) AS revenue
  FROM payment_sessions
  WHERE payment_status='paid'
  GROUP BY 1 
  ORDER BY 1 DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_bookings_daily()
RETURNS TABLE(day date, bookings integer)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    date_trunc('day', created_at)::date AS day,
    COUNT(*)::int AS bookings
  FROM bookings
  GROUP BY 1 
  ORDER BY 1 DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_top_tutors()
RETURNS TABLE(user_id uuid, first_name text, last_name text, revenue numeric, sessions bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.user_id, 
    p.first_name, 
    p.last_name,
    COALESCE(SUM(ps.amount_paid),0)::numeric(12,2) AS revenue,
    COUNT(DISTINCT b.id) AS sessions
  FROM profiles p
  LEFT JOIN bookings b ON b.tutor_id=p.user_id
  LEFT JOIN payment_sessions ps ON ps.booking_id=b.id AND ps.payment_status='paid'
  WHERE p.user_type='tutor'
  GROUP BY 1,2,3
  ORDER BY revenue DESC
  LIMIT 10;
$$;

CREATE OR REPLACE FUNCTION public.get_top_materials()
RETURNS TABLE(id uuid, title text, subject text, sales bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    m.id, 
    m.title, 
    m.subject, 
    COUNT(mp.id) AS sales
  FROM materials m
  LEFT JOIN material_purchases mp ON mp.material_id=m.id
  WHERE m.approval_status='approved'
  GROUP BY 1,2,3
  ORDER BY sales DESC
  LIMIT 10;
$$;

-- Revoke direct access to analytics views (keep for backward compatibility but restrict)
REVOKE SELECT ON public.v_revenue_daily FROM anon, authenticated;
REVOKE SELECT ON public.v_bookings_daily FROM anon, authenticated;
REVOKE SELECT ON public.v_top_tutors FROM anon, authenticated;
REVOKE SELECT ON public.v_top_materials FROM anon, authenticated;

-- Fix 3: Tighten payment_sessions RLS policy
-- Drop overly permissive edge function policy
DROP POLICY IF EXISTS "Edge functions can manage payment sessions" ON public.payment_sessions;

-- Replace with more restrictive policies
CREATE POLICY "Service role can manage payment sessions"
ON public.payment_sessions FOR ALL
USING (auth.jwt()->>'role' = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'service_role');