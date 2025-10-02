-- Ensure profiles table has all required fields for email confirmation tracking
-- This will add missing columns if they don't exist

-- Add email_confirmed_at column to track verification status
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'email_confirmed_at') THEN
        ALTER TABLE public.profiles ADD COLUMN email_confirmed_at timestamp with time zone;
    END IF;
END $$;

-- Add email column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'email') THEN
        ALTER TABLE public.profiles ADD COLUMN email text;
    END IF;
END $$;

-- Add subject_interests and qualifications arrays if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'subject_interests') THEN
        ALTER TABLE public.profiles ADD COLUMN subject_interests text[];
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'qualifications') THEN
        ALTER TABLE public.profiles ADD COLUMN qualifications text[];
    END IF;
END $$;

-- Update the handle_new_user function to include email and email confirmation tracking
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
  RETURN NEW;
END;
$$;

-- Create a trigger to update email_confirmed_at when user confirms email
CREATE OR REPLACE FUNCTION public.update_profile_email_confirmation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update profile when user confirms email
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    UPDATE public.profiles 
    SET email_confirmed_at = NEW.email_confirmed_at
    WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users for email confirmation updates
DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_email_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW 
  WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
  EXECUTE FUNCTION public.update_profile_email_confirmation();