import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import Stripe from "https://esm.sh/stripe@13.10.0?target=deno";

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response('No signature', { status: 400 });
  }

  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!webhookSecret) {
    return new Response('Webhook secret not configured', { status: 500 });
  }

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check for idempotency - have we already processed this event?
    const { data: existingEvent } = await supabase
      .from('stripe_events')
      .select('id, processed')
      .eq('stripe_event_id', event.id)
      .single();

    if (existingEvent?.processed) {
      console.log(`Event ${event.id} already processed, skipping`);
      return new Response(JSON.stringify({ received: true, skipped: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // Store event for idempotency
    if (!existingEvent) {
      await supabase.from('stripe_events').insert({
        stripe_event_id: event.id,
        event_type: event.type,
        payload: event as any,
        processed: false
      });
    }

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Update payment session
        const { error: paymentError } = await supabase
          .from('payment_sessions')
          .update({
            payment_status: 'paid',
            amount_paid: session.amount_total ? session.amount_total / 100 : 0
          })
          .eq('stripe_session_id', session.id);

        if (paymentError) {
          console.error('Error updating payment session:', paymentError);
          throw paymentError;
        }

        // If this is a booking payment, update booking status
        const { data: paymentSession } = await supabase
          .from('payment_sessions')
          .select('booking_id')
          .eq('stripe_session_id', session.id)
          .single();

        if (paymentSession?.booking_id) {
          const { error: bookingError } = await supabase
            .from('bookings')
            .update({ status: 'confirmed' })
            .eq('id', paymentSession.booking_id);

          if (bookingError) {
            console.error('Error updating booking:', bookingError);
            throw bookingError;
          }

          // Log session event
          await supabase.from('session_events').insert({
            booking_id: paymentSession.booking_id,
            event_type: 'payment_completed',
            new_status: 'confirmed',
            notes: `Payment completed via Stripe session ${session.id}`
          });
        }

        // If this is a material purchase, record it
        if (session.metadata?.material_id && session.metadata?.student_id) {
          await supabase.from('material_purchases').insert({
            material_id: session.metadata.material_id,
            student_id: session.metadata.student_id,
            amount_paid: session.amount_total ? session.amount_total / 100 : 0
          });
        }

        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`PaymentIntent ${paymentIntent.id} succeeded`);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.error(`PaymentIntent ${paymentIntent.id} failed`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Mark event as processed
    await supabase
      .from('stripe_events')
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq('stripe_event_id', event.id);

    return new Response(
      JSON.stringify({ received: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});