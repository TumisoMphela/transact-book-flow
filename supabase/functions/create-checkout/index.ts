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
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

const CreateCheckoutSchema = z.object({
  bookingId: z.string().uuid({ message: 'Invalid booking ID format' }).optional(),
  type: z.enum(['booking', 'material']).optional(),
  material_id: z.string().uuid().optional(),
  amount: z.number().optional(),
  title: z.string().optional(),
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    logStep("User authenticated", { userId: user.id, email: user.email });

    const body = await req.json();
    const validation = CreateCheckoutSchema.safeParse(body);
    
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
    
    const { bookingId, type = 'booking', material_id } = validation.data;

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    let sessionData: any = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      mode: "payment",
      success_url: `${req.headers.get("origin")}/booking-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/dashboard`,
    };

    if (type === 'material' && material_id) {
      // Handle material purchase
      const { data: material, error: materialError } = await supabaseClient
        .from('materials')
        .select('id, title, price, tutor_id')
        .eq('id', material_id)
        .single();

      if (materialError || !material) {
        logStep("Material not found", materialError);
        throw new Error("Material not found");
      }

      logStep("Material found", { materialId: material.id, price: material.price });

      sessionData.line_items = [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: material.title,
            description: 'Study Material',
          },
          unit_amount: Math.round(material.price * 100),
        },
        quantity: 1,
      }];
      sessionData.metadata = {
        material_id: material.id,
        student_id: user.id,
        type: 'material',
      };
    } else if (bookingId) {
      // Handle booking payment
      const { data: booking, error: bookingError } = await supabaseClient
        .from("bookings")
        .select(`
          *,
          tutor:profiles!tutor_id(first_name, last_name, hourly_rate),
          student:profiles!student_id(first_name, last_name)
        `)
        .eq("id", bookingId)
        .single();

      if (bookingError || !booking) throw new Error("Booking not found");
      
      // Verify user is the student for this booking
      if (booking.student_id !== user.id) throw new Error("Unauthorized access to booking");

      logStep("Booking found", { bookingId, amount: booking.total_amount });

      sessionData.line_items = [{
        price_data: {
          currency: "usd",
          product_data: {
            name: `Tutoring Session - ${booking.subject}`,
            description: `${booking.duration_hours} hour(s) with ${booking.tutor.first_name} ${booking.tutor.last_name}`,
          },
          unit_amount: Math.round(booking.total_amount * 100),
        },
        quantity: 1,
      }];
      sessionData.metadata = {
        booking_id: bookingId,
        user_id: user.id,
        type: 'booking',
      };

      // Store payment session in database (only for bookings)
      const { error: sessionError } = await supabaseClient
        .from("payment_sessions")
        .insert({
          booking_id: bookingId,
          stripe_session_id: '',  // Will update after session creation
          payment_status: "pending",
          amount_paid: booking.total_amount,
        });

      if (sessionError) {
        logStep("Error storing payment session", sessionError);
        throw new Error("Failed to store payment session");
      }
    } else {
      throw new Error("Invalid request: missing bookingId or material_id");
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create(sessionData);

    // Update payment session with stripe session id (for bookings)
    if (bookingId) {
      await supabaseClient
        .from("payment_sessions")
        .update({ stripe_session_id: session.id })
        .eq('booking_id', bookingId)
        .is('stripe_session_id', null);
    }

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-checkout", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});