-- =====================================================
-- SECURITY HARDENING PART 2
-- Fix remaining functions missing search_path
-- =====================================================

-- Function: is_within_availability
CREATE OR REPLACE FUNCTION public.is_within_availability(_tutor uuid, _start timestamp with time zone, _end timestamp with time zone)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $function$
  WITH s AS (
    SELECT EXTRACT(DOW FROM _start AT TIME ZONE 'UTC')::int AS dow,
           (_start AT TIME ZONE 'UTC')::time AS st,
           (_end   AT TIME ZONE 'UTC')::time AS et
  )
  SELECT EXISTS (
    SELECT 1 FROM availability a, s
    WHERE a.tutor_id=_tutor AND a.is_available
      AND a.day_of_week = s.dow
      AND a.start_time <= s.st AND a.end_time >= s.et
  );
$function$;

-- Function: get_revenue_daily
CREATE OR REPLACE FUNCTION public.get_revenue_daily()
RETURNS TABLE(day date, revenue numeric)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT 
    date_trunc('day', created_at)::date AS day,
    COALESCE(SUM(amount_paid),0)::numeric(12,2) AS revenue
  FROM payment_sessions
  WHERE payment_status='paid'
  GROUP BY 1 
  ORDER BY 1 DESC;
$function$;

-- Function: get_bookings_daily
CREATE OR REPLACE FUNCTION public.get_bookings_daily()
RETURNS TABLE(day date, bookings integer)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT 
    date_trunc('day', created_at)::date AS day,
    COUNT(*)::int AS bookings
  FROM bookings
  GROUP BY 1 
  ORDER BY 1 DESC;
$function$;

-- Function: get_top_tutors
CREATE OR REPLACE FUNCTION public.get_top_tutors()
RETURNS TABLE(user_id uuid, first_name text, last_name text, revenue numeric, sessions bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- Function: get_top_materials
CREATE OR REPLACE FUNCTION public.get_top_materials()
RETURNS TABLE(id uuid, title text, subject text, sales bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- Add documentation comments
COMMENT ON FUNCTION public.is_within_availability(_tutor uuid, _start timestamp with time zone, _end timestamp with time zone) IS 
  'Checks if a time slot falls within a tutor''s availability. SET search_path = public prevents schema injection.';

COMMENT ON FUNCTION public.get_revenue_daily() IS 
  'Returns daily revenue from paid bookings. SECURITY DEFINER allows admin access. SET search_path = public prevents schema injection.';

COMMENT ON FUNCTION public.get_bookings_daily() IS 
  'Returns daily booking counts. SECURITY DEFINER allows admin access. SET search_path = public prevents schema injection.';

COMMENT ON FUNCTION public.get_top_tutors() IS 
  'Returns top 10 tutors by revenue. SECURITY DEFINER allows admin access. SET search_path = public prevents schema injection.';

COMMENT ON FUNCTION public.get_top_materials() IS 
  'Returns top 10 materials by sales. SECURITY DEFINER allows admin access. SET search_path = public prevents schema injection.';