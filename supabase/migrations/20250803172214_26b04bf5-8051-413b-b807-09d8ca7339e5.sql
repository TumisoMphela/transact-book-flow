-- Enable real-time updates for messages and materials tables
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.materials REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.materials;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- Add location field to profiles for enhanced search
ALTER TABLE public.profiles ADD COLUMN location TEXT;

-- Add verification status for tutors
ALTER TABLE public.profiles ADD COLUMN is_verified BOOLEAN DEFAULT false;

-- Create conversations table for messaging
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  participant_2 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(participant_1, participant_2)
);

-- Enable RLS for conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Create policies for conversations
CREATE POLICY "Users can view their own conversations" 
ON public.conversations 
FOR SELECT 
USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

CREATE POLICY "Users can create conversations" 
ON public.conversations 
FOR INSERT 
WITH CHECK (auth.uid() = participant_1 OR auth.uid() = participant_2);

-- Update messages table to reference conversations
ALTER TABLE public.messages ADD COLUMN conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE;

-- Create material purchases table
CREATE TABLE public.material_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_paid NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(material_id, student_id)
);

-- Enable RLS for material purchases
ALTER TABLE public.material_purchases ENABLE ROW LEVEL SECURITY;

-- Create policies for material purchases
CREATE POLICY "Users can view their own purchases" 
ON public.material_purchases 
FOR SELECT 
USING (auth.uid() = student_id);

CREATE POLICY "Users can create purchases" 
ON public.material_purchases 
FOR INSERT 
WITH CHECK (auth.uid() = student_id);