-- Tutor Academy: Courses, Lessons, Quizzes, Progress
CREATE TABLE IF NOT EXISTS public.tutor_courses(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  difficulty text CHECK (difficulty IN ('beginner','intermediate','advanced')) DEFAULT 'beginner',
  duration_hours integer DEFAULT 1,
  is_published boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.course_lessons(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES public.tutor_courses(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  video_url text,
  content text,
  order_index integer NOT NULL,
  duration_minutes integer DEFAULT 10,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lesson_quizzes(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid REFERENCES public.course_lessons(id) ON DELETE CASCADE NOT NULL,
  question text NOT NULL,
  options jsonb NOT NULL,
  correct_answer text NOT NULL,
  explanation text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.course_progress(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_id uuid REFERENCES public.tutor_courses(id) ON DELETE CASCADE NOT NULL,
  lesson_id uuid REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  completed boolean DEFAULT false,
  quiz_score integer,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(user_id, course_id, lesson_id)
);

-- Study Groups (group chat)
CREATE TABLE IF NOT EXISTS public.study_groups(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text,
  description text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_public boolean DEFAULT true,
  member_limit integer DEFAULT 50,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.group_members(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.study_groups(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text CHECK (role IN ('admin','member')) DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  UNIQUE(group_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.group_messages(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.study_groups(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  media_url text,
  media_type text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enhance profiles with Academy features
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS tutor_level text CHECK (tutor_level IN ('Uncertified','Certified','Expert')) DEFAULT 'Uncertified',
  ADD COLUMN IF NOT EXISTS certificates jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS stripe_account_id text,
  ADD COLUMN IF NOT EXISTS completed_courses integer DEFAULT 0;

-- Material payouts enhancement
ALTER TABLE public.materials
  ADD COLUMN IF NOT EXISTS payout_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_earnings numeric DEFAULT 0;

-- Enable RLS
ALTER TABLE public.tutor_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Tutor Academy
CREATE POLICY "Anyone can view published courses" ON public.tutor_courses
  FOR SELECT USING (is_published = true);

CREATE POLICY "Admins can manage all courses" ON public.tutor_courses
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view lessons of published courses" ON public.course_lessons
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.tutor_courses WHERE id = course_lessons.course_id AND is_published = true)
  );

CREATE POLICY "Admins can manage all lessons" ON public.course_lessons
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view quizzes" ON public.lesson_quizzes
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage quizzes" ON public.lesson_quizzes
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own progress" ON public.course_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress" ON public.course_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress" ON public.course_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies: Study Groups
CREATE POLICY "Anyone can view public groups" ON public.study_groups
  FOR SELECT USING (is_public = true);

CREATE POLICY "Members can view their groups" ON public.study_groups
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.group_members WHERE group_id = study_groups.id AND user_id = auth.uid())
  );

CREATE POLICY "Authenticated users can create groups" ON public.study_groups
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group admins can update groups" ON public.study_groups
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.group_members WHERE group_id = study_groups.id AND user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Members can view group membership" ON public.group_members
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid())
  );

CREATE POLICY "Group admins can manage members" ON public.group_members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.group_members WHERE group_id = group_members.group_id AND user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can join public groups" ON public.group_members
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND 
    EXISTS (SELECT 1 FROM public.study_groups WHERE id = group_members.group_id AND is_public = true)
  );

CREATE POLICY "Members can view group messages" ON public.group_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.group_members WHERE group_id = group_messages.group_id AND user_id = auth.uid())
  );

CREATE POLICY "Members can send messages" ON public.group_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (SELECT 1 FROM public.group_members WHERE group_id = group_messages.group_id AND user_id = auth.uid())
  );

-- Triggers for updated_at
CREATE TRIGGER update_tutor_courses_updated_at
  BEFORE UPDATE ON public.tutor_courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_course_lessons_updated_at
  BEFORE UPDATE ON public.course_lessons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_study_groups_updated_at
  BEFORE UPDATE ON public.study_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_group_messages_updated_at
  BEFORE UPDATE ON public.group_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_course_lessons_course_id ON public.course_lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_lesson_quizzes_lesson_id ON public.lesson_quizzes(lesson_id);
CREATE INDEX IF NOT EXISTS idx_course_progress_user_id ON public.course_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_group_id ON public.group_messages(group_id);

-- Enable realtime for study groups
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;
ALTER TABLE public.group_messages REPLICA IDENTITY FULL;