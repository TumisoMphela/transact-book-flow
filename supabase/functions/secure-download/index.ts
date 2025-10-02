import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { material_id } = await req.json();

    if (!material_id) {
      throw new Error('Material ID is required');
    }

    // Get material details
    const { data: material, error: materialError } = await supabase
      .from('materials')
      .select('*')
      .eq('id', material_id)
      .eq('approval_status', 'approved')
      .single();

    if (materialError || !material) {
      throw new Error('Material not found or not approved');
    }

    // Check if material is paid
    if (material.price > 0 && material.tutor_id !== user.id) {
      // Check if user has purchased this material
      const { data: purchase, error: purchaseError } = await supabase
        .from('material_purchases')
        .select('id')
        .eq('material_id', material_id)
        .eq('student_id', user.id)
        .single();

      if (purchaseError || !purchase) {
        throw new Error('Material not purchased');
      }
    }

    // Log download
    await supabase
      .from('material_downloads')
      .insert({
        material_id: material_id,
        user_id: user.id
      });

    // Increment download count
    await supabase
      .from('materials')
      .update({ download_count: (material.download_count || 0) + 1 })
      .eq('id', material_id);

    // Extract file path from URL
    const urlParts = new URL(material.file_url);
    const filePath = urlParts.pathname.split('/').slice(-2).join('/');

    // Create signed URL with short expiry
    const { data: signedData, error: signedError } = await supabase.storage
      .from('materials')
      .createSignedUrl(filePath, 60); // 60 seconds

    if (signedError) throw signedError;

    return new Response(
      JSON.stringify({ 
        success: true,
        download_url: signedData.signedUrl,
        expires_in: 60
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Error in secure-download:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});