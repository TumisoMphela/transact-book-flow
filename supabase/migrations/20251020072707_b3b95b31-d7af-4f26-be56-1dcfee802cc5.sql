-- =====================================================
-- SECURITY HARDENING MIGRATION
-- Fixes: Missing search_path, Restrictive payment RLS
-- =====================================================

-- ============================================
-- PART 1: Add SET search_path to all functions
-- ============================================

-- Function: update_profile_email_confirmation
CREATE OR REPLACE FUNCTION public.update_profile_email_confirmation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Update profile when user confirms email
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    UPDATE public.profiles 
    SET email_confirmed_at = NEW.email_confirmed_at
    WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;

-- Function: get_tutor_average_rating
CREATE OR REPLACE FUNCTION public.get_tutor_average_rating(tutor_user_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $function$
BEGIN
  RETURN (
    SELECT COALESCE(AVG(rating::DECIMAL), 0.0)
    FROM public.reviews
    WHERE tutor_id = tutor_user_id
  );
END;
$function$;

-- Function: get_tutor_review_count
CREATE OR REPLACE FUNCTION public.get_tutor_review_count(tutor_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $function$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM public.reviews
    WHERE tutor_id = tutor_user_id
  );
END;
$function$;

-- Function: increment_download_count
CREATE OR REPLACE FUNCTION public.increment_download_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE public.materials
  SET download_count = download_count + 1
  WHERE id = NEW.material_id;
  RETURN NEW;
END;
$function$;

-- Function: log_booking_status_change
CREATE OR REPLACE FUNCTION public.log_booking_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.session_events (
      booking_id,
      event_type,
      old_status,
      new_status,
      changed_by,
      notes
    ) VALUES (
      NEW.id,
      'status_change',
      OLD.status,
      NEW.status,
      auth.uid(),
      CASE 
        WHEN NEW.status = 'confirmed' THEN 'Booking confirmed'
        WHEN NEW.status = 'cancelled' THEN 'Booking cancelled'
        WHEN NEW.status = 'completed' THEN 'Session completed'
        ELSE 'Status updated'
      END
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- Function: validate_booking
CREATE OR REPLACE FUNCTION public.validate_booking()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  _end timestamptz;
BEGIN
  _end := NEW.session_date + (NEW.duration_hours || ' hours')::interval;

  IF NOT public.is_within_availability(NEW.tutor_id, NEW.session_date, _end) THEN
    RAISE EXCEPTION 'Requested slot is outside tutor availability';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.tutor_id = NEW.tutor_id
      AND b.status IN ('pending','confirmed')
      AND b.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND tstzrange(b.session_date, b.session_date + (b.duration_hours || ' hours')::interval, '[)') &&
          tstzrange(NEW.session_date, _end, '[)')
  ) THEN
    RAISE EXCEPTION 'Requested slot overlaps with an existing booking';
  END IF;

  RETURN NEW;
END;
$function$;

-- Function: handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (
    user_id, 
    user_type, 
    first_name, 
    last_name, 
    email,
    email_confirmed_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'student'),
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.email,
    NEW.email_confirmed_at
  );
  
  -- Assign role based on user_type
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'student')::app_role
  );
  
  RETURN NEW;
END;
$function$;

-- Function: update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- ============================================
-- PART 2: Secure payment_sessions RLS Policies
-- ============================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Service role can manage payment sessions" ON public.payment_sessions;
DROP POLICY IF EXISTS "Allow all inserts" ON public.payment_sessions;

-- Create strict service role policy for edge functions
CREATE POLICY "Edge functions only (service role)"
ON public.payment_sessions
FOR ALL
USING (
  current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
)
WITH CHECK (
  current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
);

-- Recreate user view policy with proper joins
DROP POLICY IF EXISTS "Users can view their own payment sessions" ON public.payment_sessions;

CREATE POLICY "Users can view own payment sessions"
ON public.payment_sessions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.bookings
    WHERE bookings.id = payment_sessions.booking_id
    AND (bookings.student_id = auth.uid() OR bookings.tutor_id = auth.uid())
  )
);

-- ============================================
-- PART 3: Add comments for documentation
-- ============================================

COMMENT ON FUNCTION public.update_profile_email_confirmation() IS 
  'Trigger function to update profile email confirmation timestamp. SET search_path = public prevents schema injection.';

COMMENT ON FUNCTION public.validate_booking() IS 
  'Validates booking slots against tutor availability and existing bookings. SET search_path = public prevents schema injection.';

COMMENT ON POLICY "Edge functions only (service role)" ON public.payment_sessions IS 
  'Only Supabase Edge Functions with service_role can insert/update payment sessions. Prevents unauthorized payment manipulation.';

COMMENT ON POLICY "Users can view own payment sessions" ON public.payment_sessions IS 
  'Users can only view payment sessions for bookings they are involved in (as student or tutor).';