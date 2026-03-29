-- ============================================
-- Baktore Training System - Supabase Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Profiles table (role management)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('admin', 'teacher', 'student')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Courses table
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Lessons table
CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Progress table
CREATE TABLE progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  score INT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

-- 5. View logs table
CREATE TABLE view_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE NOT NULL,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_seconds INT NOT NULL DEFAULT 0
);

-- ============================================
-- Helper function to get current user role
-- SECURITY DEFINER bypasses RLS to avoid infinite recursion
-- ============================================

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- RLS (Row Level Security) Policies
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE view_logs ENABLE ROW LEVEL SECURITY;

-- profiles: own row always visible, admins/teachers can see all
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT
  USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT
  USING (public.get_my_role() = 'admin');
CREATE POLICY "Teachers can view all profiles" ON profiles FOR SELECT
  USING (public.get_my_role() = 'teacher');
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE
  USING (auth.uid() = id);
CREATE POLICY "Admins can update any profile" ON profiles FOR UPDATE
  USING (public.get_my_role() = 'admin');
CREATE POLICY "Allow insert own profile" ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- courses: everyone can view, teachers and admins can create/edit
CREATE POLICY "Anyone can view courses" ON courses FOR SELECT
  USING (true);
CREATE POLICY "Teachers and admins can insert courses" ON courses FOR INSERT
  WITH CHECK (public.get_my_role() IN ('admin', 'teacher'));
CREATE POLICY "Teachers and admins can update courses" ON courses FOR UPDATE
  USING (public.get_my_role() IN ('admin', 'teacher'));
CREATE POLICY "Admins can delete courses" ON courses FOR DELETE
  USING (public.get_my_role() = 'admin');

-- lessons: everyone can view, teachers and admins can create/edit
CREATE POLICY "Anyone can view lessons" ON lessons FOR SELECT
  USING (true);
CREATE POLICY "Teachers and admins can insert lessons" ON lessons FOR INSERT
  WITH CHECK (public.get_my_role() IN ('admin', 'teacher'));
CREATE POLICY "Teachers and admins can update lessons" ON lessons FOR UPDATE
  USING (public.get_my_role() IN ('admin', 'teacher'));
CREATE POLICY "Admins can delete lessons" ON lessons FOR DELETE
  USING (public.get_my_role() = 'admin');

-- progress: users can read/write own, teachers and admins can view all
CREATE POLICY "Users can view own progress" ON progress FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Teachers can view all progress" ON progress FOR SELECT
  USING (public.get_my_role() IN ('admin', 'teacher'));
CREATE POLICY "Users can insert own progress" ON progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON progress FOR UPDATE
  USING (auth.uid() = user_id);

-- view_logs: users can insert own, teachers and admins can view all
CREATE POLICY "Users can insert own view logs" ON view_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own logs" ON view_logs FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Teachers can view all logs" ON view_logs FOR SELECT
  USING (public.get_my_role() IN ('admin', 'teacher'));

-- ============================================
-- Trigger: auto-create profile on user signup
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
