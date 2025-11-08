import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MessageNotificationRequest {
  messageId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { messageId }: MessageNotificationRequest = await req.json();

    // Fetch message details with sender and receiver info
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(first_name, last_name, email),
        receiver:profiles!messages_receiver_id_fkey(first_name, last_name, email)
      `)
      .eq('id', messageId)
      .single();

    if (messageError || !message) {
      throw new Error('Message not found');
    }

    const senderName = `${message.sender.first_name} ${message.sender.last_name}`;
    const receiverName = `${message.receiver.first_name} ${message.receiver.last_name}`;

    // Send email to receiver
    const { error: emailError } = await resend.emails.send({
      from: "TutorHub <onboarding@resend.dev>",
      to: [message.receiver.email],
      subject: `New Message from ${senderName}`,
      html: `
        <h1>You have a new message!</h1>
        <p>Hi ${message.receiver.first_name},</p>
        <p><strong>${senderName}</strong> sent you a message:</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p>${message.content}</p>
        </div>
        <p>Reply to this message in your dashboard.</p>
        <p>Best regards,<br>TutorHub Team</p>
      `,
    });

    if (emailError) {
      console.error('Email error:', emailError);
    }

    // Create in-app notification
    await supabase.from('notifications').insert({
      user_id: message.receiver_id,
      type: 'message',
      title: `New message from ${senderName}`,
      message: message.content.substring(0, 100) + (message.content.length > 100 ? '...' : ''),
      link: '/dashboard?tab=messages',
    });

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error in send-message-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
