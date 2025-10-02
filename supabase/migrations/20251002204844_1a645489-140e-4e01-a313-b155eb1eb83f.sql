-- Phase 1: Critical Security - Role-Based Access System

-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'tutor', 'student');

-- 2. Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

-- 4. Create helper function to get user roles
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id uuid)
RETURNS app_role[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ARRAY_AGG(role)
  FROM public.user_roles
  WHERE user_id = _user_id;
$$;

-- 5. RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6. Create admin audit log table
CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES auth.users(id) NOT NULL,
  action text NOT NULL,
  target_table text,
  target_id uuid,
  old_data jsonb,
  new_data jsonb,
  reason text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs"
ON public.admin_audit_log
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert audit logs"
ON public.admin_audit_log
FOR INSERT
WITH CHECK (true);

-- 7. Create session_events table for booking history
CREATE TABLE public.session_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL,
  old_status text,
  new_status text,
  changed_by uuid REFERENCES auth.users(id),
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.session_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view events for their bookings"
ON public.session_events
FOR SELECT
USING (
  booking_id IN (
    SELECT id FROM public.bookings 
    WHERE tutor_id = auth.uid() OR student_id = auth.uid()
  )
);

CREATE POLICY "System can insert session events"
ON public.session_events
FOR INSERT
WITH CHECK (true);

-- 8. Add approval_status to materials
ALTER TABLE public.materials 
ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending' CHECK (approval_status IN ('draft', 'pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS rejection_reason text,
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone;

-- 9. Create material_downloads tracking table
CREATE TABLE IF NOT EXISTS public.material_downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid REFERENCES public.materials(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  downloaded_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.material_downloads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own downloads"
ON public.material_downloads
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert downloads"
ON public.material_downloads
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 10. Create stripe_events table for idempotency
CREATE TABLE IF NOT EXISTS public.stripe_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text UNIQUE NOT NULL,
  event_type text NOT NULL,
  processed boolean DEFAULT false,
  payload jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  processed_at timestamp with time zone
);

ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only system can manage stripe events"
ON public.stripe_events
FOR ALL
USING (false)
WITH CHECK (false);

-- 11. Update profiles RLS policies to use role system
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Anyone can view basic profile info"
ON public.profiles
FOR SELECT
USING (true);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 12. Update materials RLS to use approval_status
DROP POLICY IF EXISTS "Anyone can view approved materials" ON public.materials;

CREATE POLICY "Anyone can view approved materials"
ON public.materials
FOR SELECT
USING (approval_status = 'approved');

CREATE POLICY "Tutors can view their own materials"
ON public.materials
FOR SELECT
USING (auth.uid() = tutor_id);

CREATE POLICY "Admins can view all materials"
ON public.materials
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update materials"
ON public.materials
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 13. Update bookings RLS
DROP POLICY IF EXISTS "Students can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can update their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.bookings;

CREATE POLICY "Students can create bookings"
ON public.bookings
FOR INSERT
WITH CHECK (
  auth.uid() = student_id AND
  public.has_role(auth.uid(), 'student')
);

CREATE POLICY "Participants can view their bookings"
ON public.bookings
FOR SELECT
USING (auth.uid() = tutor_id OR auth.uid() = student_id);

CREATE POLICY "Participants can update their bookings"
ON public.bookings
FOR UPDATE
USING (auth.uid() = tutor_id OR auth.uid() = student_id)
WITH CHECK (auth.uid() = tutor_id OR auth.uid() = student_id);

CREATE POLICY "Admins can view all bookings"
ON public.bookings
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all bookings"
ON public.bookings
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 14. Update reviews RLS
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;
DROP POLICY IF EXISTS "Students can insert reviews for tutors they've booked" ON public.reviews;

CREATE POLICY "Anyone can view reviews"
ON public.reviews
FOR SELECT
USING (true);

CREATE POLICY "Students can insert reviews after completed booking"
ON public.reviews
FOR INSERT
WITH CHECK (
  auth.uid() = student_id AND
  EXISTS (
    SELECT 1 FROM public.bookings
    WHERE student_id = auth.uid()
      AND tutor_id = reviews.tutor_id
      AND status = 'completed'
  )
);

-- 15. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);
CREATE INDEX IF NOT EXISTS idx_session_events_booking_id ON public.session_events(booking_id);
CREATE INDEX IF NOT EXISTS idx_material_downloads_material_id ON public.material_downloads(material_id);
CREATE INDEX IF NOT EXISTS idx_material_downloads_user_id ON public.material_downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_materials_approval_status ON public.materials(approval_status);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_session_date ON public.bookings(session_date);
CREATE INDEX IF NOT EXISTS idx_stripe_events_stripe_event_id ON public.stripe_events(stripe_event_id);

-- 16. Update handle_new_user function to assign roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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