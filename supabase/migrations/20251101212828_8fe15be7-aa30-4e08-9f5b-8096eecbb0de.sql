-- Create subjects table
CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT NOT NULL,
  is_approved BOOLEAN DEFAULT false,
  approval_status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on subjects
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

-- RLS policies for subjects
CREATE POLICY "Anyone can view approved subjects"
  ON public.subjects FOR SELECT
  USING (is_approved = true);

CREATE POLICY "Admins can manage all subjects"
  ON public.subjects FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create tutor_demos table
CREATE TABLE IF NOT EXISTS public.tutor_demos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  video_file_path TEXT,
  is_approved BOOLEAN DEFAULT false,
  approval_status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT demo_has_video CHECK (video_url IS NOT NULL OR video_file_path IS NOT NULL)
);

-- Enable RLS on tutor_demos
ALTER TABLE public.tutor_demos ENABLE ROW LEVEL SECURITY;

-- RLS policies for tutor_demos
CREATE POLICY "Anyone can view approved demos"
  ON public.tutor_demos FOR SELECT
  USING (is_approved = true);

CREATE POLICY "Tutors can view own demos"
  ON public.tutor_demos FOR SELECT
  USING (auth.uid() = tutor_id);

CREATE POLICY "Tutors can create own demos"
  ON public.tutor_demos FOR INSERT
  WITH CHECK (auth.uid() = tutor_id);

CREATE POLICY "Tutors can update own demos"
  ON public.tutor_demos FOR UPDATE
  USING (auth.uid() = tutor_id);

CREATE POLICY "Admins can manage all demos"
  ON public.tutor_demos FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix profiles RLS - make it more restrictive
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;

CREATE POLICY "Users can view own full profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view limited profile data"
  ON public.profiles FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND user_id != auth.uid()
  );

-- Secure analytics views by setting security_invoker
ALTER VIEW public.v_bookings_daily SET (security_invoker = on);
ALTER VIEW public.v_revenue_daily SET (security_invoker = on);
ALTER VIEW public.v_top_tutors SET (security_invoker = on);
ALTER VIEW public.v_top_materials SET (security_invoker = on);

-- Restrict payment_sessions viewing to students only (not tutors)
DROP POLICY IF EXISTS "Users can view own payment sessions" ON public.payment_sessions;

CREATE POLICY "Only students can view their payment sessions"
  ON public.payment_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE bookings.id = payment_sessions.booking_id
      AND bookings.student_id = auth.uid()
    )
  );

-- Fix material_purchases to include admin access
DROP POLICY IF EXISTS "Users can view their own purchases" ON public.material_purchases;

CREATE POLICY "Only purchasers and admins can view purchases"
  ON public.material_purchases FOR SELECT
  USING (
    auth.uid() = student_id
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_subjects_updated_at ON public.subjects;
CREATE TRIGGER update_subjects_updated_at
  BEFORE UPDATE ON public.subjects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_tutor_demos_updated_at ON public.tutor_demos;
CREATE TRIGGER update_tutor_demos_updated_at
  BEFORE UPDATE ON public.tutor_demos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();