-- ============================================
-- Fix: Replace recursive RLS policies with get_my_role() function
-- Run this in Supabase SQL Editor to fix existing DB
-- ============================================

-- Step 1: Create helper function (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Step 2: Drop all existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Teachers can view student profiles" ON profiles;
DROP POLICY IF EXISTS "Teachers can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Allow insert own profile" ON profiles;

DROP POLICY IF EXISTS "Anyone can view courses" ON courses;
DROP POLICY IF EXISTS "Teachers and admins can insert courses" ON courses;
DROP POLICY IF EXISTS "Teachers and admins can update courses" ON courses;
DROP POLICY IF EXISTS "Admins can delete courses" ON courses;

DROP POLICY IF EXISTS "Anyone can view lessons" ON lessons;
DROP POLICY IF EXISTS "Teachers and admins can insert lessons" ON lessons;
DROP POLICY IF EXISTS "Teachers and admins can update lessons" ON lessons;
DROP POLICY IF EXISTS "Admins can delete lessons" ON lessons;

DROP POLICY IF EXISTS "Users can view own progress" ON progress;
DROP POLICY IF EXISTS "Teachers can view all progress" ON progress;
DROP POLICY IF EXISTS "Users can insert own progress" ON progress;
DROP POLICY IF EXISTS "Users can update own progress" ON progress;

DROP POLICY IF EXISTS "Users can insert own view logs" ON view_logs;
DROP POLICY IF EXISTS "Users can view own logs" ON view_logs;
DROP POLICY IF EXISTS "Teachers can view all logs" ON view_logs;

-- Step 3: Recreate policies using get_my_role()
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

CREATE POLICY "Anyone can view courses" ON courses FOR SELECT
  USING (true);
CREATE POLICY "Teachers and admins can insert courses" ON courses FOR INSERT
  WITH CHECK (public.get_my_role() IN ('admin', 'teacher'));
CREATE POLICY "Teachers and admins can update courses" ON courses FOR UPDATE
  USING (public.get_my_role() IN ('admin', 'teacher'));
CREATE POLICY "Admins can delete courses" ON courses FOR DELETE
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Anyone can view lessons" ON lessons FOR SELECT
  USING (true);
CREATE POLICY "Teachers and admins can insert lessons" ON lessons FOR INSERT
  WITH CHECK (public.get_my_role() IN ('admin', 'teacher'));
CREATE POLICY "Teachers and admins can update lessons" ON lessons FOR UPDATE
  USING (public.get_my_role() IN ('admin', 'teacher'));
CREATE POLICY "Admins can delete lessons" ON lessons FOR DELETE
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Users can view own progress" ON progress FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Teachers can view all progress" ON progress FOR SELECT
  USING (public.get_my_role() IN ('admin', 'teacher'));
CREATE POLICY "Users can insert own progress" ON progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own view logs" ON view_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own logs" ON view_logs FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Teachers can view all logs" ON view_logs FOR SELECT
  USING (public.get_my_role() IN ('admin', 'teacher'));
