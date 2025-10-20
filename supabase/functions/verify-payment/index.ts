import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-PAYMENT] ${step}${detailsStr}`);
};

const VerifyPaymentSchema = z.object({
  sessionId: z.string().min(1, { message: 'Session ID is required' }),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    // Use service role key for database operations
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const body = await req.json();
    const validation = VerifyPaymentSchema.safeParse(body);

    if (!validation.success) {
      logStep("Validation error", validation.error.issues);
      return new Response(
        JSON.stringify({ 
          error: "Invalid input", 
          details: validation.error.issues 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const { sessionId } = validation.data;

    logStep("Verifying payment session", { sessionId });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (!session) throw new Error("Session not found");

    const bookingId = session.metadata?.booking_id;
    if (!bookingId) throw new Error("Booking ID not found in session metadata");

    logStep("Session retrieved", { 
      sessionId, 
      paymentStatus: session.payment_status,
      bookingId 
    });

    // Update payment session status
    const { error: updateSessionError } = await supabaseClient
      .from("payment_sessions")
      .update({
        payment_status: session.payment_status,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_session_id", sessionId);

    if (updateSessionError) {
      logStep("Error updating payment session", updateSessionError);
    }

    // If payment is complete, update booking status
    if (session.payment_status === "paid") {
      const { error: updateBookingError } = await supabaseClient
        .from("bookings")
        .update({
          status: "confirmed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookingId);

      if (updateBookingError) {
        logStep("Error updating booking status", updateBookingError);
        throw new Error("Failed to update booking status");
      }

      logStep("Booking confirmed", { bookingId });
    }

    return new Response(JSON.stringify({ 
      payment_status: session.payment_status,
      booking_id: bookingId,
      session_id: sessionId
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in verify-payment", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});