import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2023-10-16',
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { earning_ids } = await req.json();

    // Get connect account
    const { data: connectAccount } = await supabase
      .from('connect_accounts')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!connectAccount?.onboarding_complete) {
      return new Response(JSON.stringify({ error: 'Connect account not complete' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get earnings
    const { data: earnings, error: earningsError } = await supabase
      .from('earnings')
      .select('*')
      .in('id', earning_ids)
      .eq('user_id', user.id)
      .eq('is_paid', false);

    if (earningsError || !earnings || earnings.length === 0) {
      return new Response(JSON.stringify({ error: 'No unpaid earnings found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const totalAmount = earnings.reduce((sum, e) => sum + parseFloat(e.net_amount.toString()), 0);
    const amountInCents = Math.round(totalAmount * 100);

    // Create transfer
    const transfer = await stripe.transfers.create({
      amount: amountInCents,
      currency: 'zar',
      destination: connectAccount.account_id,
      description: `Payout for ${earnings.length} transactions`,
    });

    // Mark as paid
    await supabase
      .from('earnings')
      .update({ is_paid: true })
      .in('id', earning_ids);

    // Create notification
    await supabase.from('notifications').insert({
      user_id: user.id,
      type: 'payout',
      title: 'Payout Successful',
      message: `R${totalAmount.toFixed(2)} has been transferred to your account.`,
      link: '/dashboard/earnings',
    });

    return new Response(JSON.stringify({ 
      success: true,
      transfer_id: transfer.id,
      amount: totalAmount,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
