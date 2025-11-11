-- 2025-11-10 Production Upgrade - Working with Existing Schema

-- =============================================
-- 1. STRIPE CONNECT & EARNINGS
-- =============================================

CREATE TABLE IF NOT EXISTS public.connect_accounts (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id text UNIQUE,
  onboarding_complete boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.connect_accounts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "owner read connect" ON public.connect_accounts FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "owner insert connect" ON public.connect_accounts FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "owner update connect" ON public.connect_accounts FOR UPDATE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.earning_source AS ENUM ('material', 'booking'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source earning_source NOT NULL,
  source_id uuid NOT NULL,
  gross_amount numeric(12,2) NOT NULL,
  platform_fee numeric(12,2) NOT NULL,
  net_amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'ZAR',
  is_paid boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_earnings_user ON public.earnings(user_id, is_paid);
ALTER TABLE public.earnings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "owner read earnings" ON public.earnings FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================
-- 2. MATERIALS
-- =============================================

ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS uploader_id uuid REFERENCES auth.users(id);
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS uploader_role text DEFAULT 'tutor';

UPDATE public.materials SET uploader_id = tutor_id WHERE uploader_id IS NULL AND tutor_id IS NOT NULL;

-- =============================================
-- 3. DEMOS
-- =============================================

ALTER TABLE public.tutor_demos DROP CONSTRAINT IF EXISTS demo_has_video;
ALTER TABLE public.tutor_demos ADD CONSTRAINT demo_has_video CHECK (video_url IS NOT NULL OR video_file_path IS NOT NULL);

CREATE OR REPLACE FUNCTION public.admin_approve_demo(_id uuid, _approve boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE public.tutor_demos SET is_approved = _approve, approval_status = CASE WHEN _approve THEN 'approved' ELSE 'rejected' END, updated_at = now() WHERE id = _id;
END$$;

-- =============================================
-- 4. SUBJECTS INDEX
-- =============================================

CREATE INDEX IF NOT EXISTS idx_subjects_approved ON public.subjects(is_approved);

-- =============================================
-- 5. MESSAGING ENHANCEMENTS
-- =============================================

ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS conversation_id uuid;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS media_path text;

-- =============================================
-- 6. LMS ENHANCEMENTS (using existing tutor_courses/course_lessons)
-- =============================================

ALTER TABLE public.tutor_courses ADD COLUMN IF NOT EXISTS thumbnail_url text;
ALTER TABLE public.course_lessons ADD COLUMN IF NOT EXISTS content_md text;

CREATE TABLE IF NOT EXISTS public.lesson_quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  question text NOT NULL,
  options jsonb NOT NULL,
  correct_answer text NOT NULL,
  explanation text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.lesson_quizzes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "anyone view quizzes" ON public.lesson_quizzes FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "admin manage quizzes" ON public.lesson_quizzes FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)); EXCEPTION WHEN duplicate_object THEN NULL; END $$;