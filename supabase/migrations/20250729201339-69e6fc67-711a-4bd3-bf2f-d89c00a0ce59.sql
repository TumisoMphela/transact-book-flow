-- Enable real-time updates for bookings table
ALTER TABLE public.bookings REPLICA IDENTITY FULL;

-- Add bookings to the realtime publication for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;

-- Create a payment_sessions table to track Stripe sessions
CREATE TABLE public.payment_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  stripe_session_id TEXT UNIQUE NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  amount_paid NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for payment_sessions
ALTER TABLE public.payment_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for payment_sessions
CREATE POLICY "Users can view their own payment sessions" 
ON public.payment_sessions 
FOR SELECT 
USING (
  booking_id IN (
    SELECT id FROM public.bookings 
    WHERE student_id = auth.uid() OR tutor_id = auth.uid()
  )
);

CREATE POLICY "Edge functions can manage payment sessions" 
ON public.payment_sessions 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_payment_sessions_updated_at
BEFORE UPDATE ON public.payment_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();