import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
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

    // Check if user is admin
    const { data: roles, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (roleError || !roles) {
      throw new Error('Access denied - admin role required');
    }

    const { material_id, approved, reason } = await req.json();

    if (!material_id) {
      throw new Error('Material ID is required');
    }

    const updateData: any = {
      approval_status: approved ? 'approved' : 'rejected',
      approved_by: user.id,
      approved_at: new Date().toISOString()
    };

    if (!approved && reason) {
      updateData.rejection_reason = reason;
    }

    // Update material
    const { error: updateError } = await supabase
      .from('materials')
      .update(updateData)
      .eq('id', material_id);

    if (updateError) throw updateError;

    // Log admin action
    const { error: auditError } = await supabase
      .from('admin_audit_log')
      .insert({
        admin_id: user.id,
        action: approved ? 'approve_material' : 'reject_material',
        target_table: 'materials',
        target_id: material_id,
        reason: reason || null
      });

    if (auditError) {
      console.error('Failed to log admin action:', auditError);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Material ${approved ? 'approved' : 'rejected'} successfully`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Error in admin-approve-material:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});