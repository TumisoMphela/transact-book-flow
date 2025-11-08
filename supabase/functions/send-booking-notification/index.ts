import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BookingNotificationRequest {
  bookingId: string;
  type: 'created' | 'confirmed' | 'cancelled' | 'completed';
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

    const { bookingId, type }: BookingNotificationRequest = await req.json();

    // Fetch booking details with tutor and student info
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        tutor:profiles!bookings_tutor_id_fkey(first_name, last_name, email),
        student:profiles!bookings_student_id_fkey(first_name, last_name, email)
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      throw new Error('Booking not found');
    }

    let emailSubject = '';
    let emailHtml = '';
    let recipientEmail = '';
    let recipientName = '';
    let notificationUserId = '';

    switch (type) {
      case 'created':
        // Notify tutor
        recipientEmail = booking.tutor.email;
        recipientName = `${booking.tutor.first_name} ${booking.tutor.last_name}`;
        notificationUserId = booking.tutor_id;
        emailSubject = 'New Booking Request';
        emailHtml = `
          <h1>New Booking Request</h1>
          <p>Hi ${booking.tutor.first_name},</p>
          <p>You have received a new booking request from ${booking.student.first_name} ${booking.student.last_name}.</p>
          <p><strong>Details:</strong></p>
          <ul>
            <li>Subject: ${booking.subject}</li>
            <li>Date: ${new Date(booking.session_date).toLocaleString()}</li>
            <li>Duration: ${booking.duration_hours} hour(s)</li>
            <li>Amount: $${booking.total_amount}</li>
          </ul>
          <p>Please confirm or manage this booking in your dashboard.</p>
        `;
        break;

      case 'confirmed':
        // Notify student
        recipientEmail = booking.student.email;
        recipientName = `${booking.student.first_name} ${booking.student.last_name}`;
        notificationUserId = booking.student_id;
        emailSubject = 'Booking Confirmed';
        emailHtml = `
          <h1>Your Booking is Confirmed!</h1>
          <p>Hi ${booking.student.first_name},</p>
          <p>Great news! Your tutoring session with ${booking.tutor.first_name} ${booking.tutor.last_name} has been confirmed.</p>
          <p><strong>Session Details:</strong></p>
          <ul>
            <li>Subject: ${booking.subject}</li>
            <li>Date & Time: ${new Date(booking.session_date).toLocaleString()}</li>
            <li>Duration: ${booking.duration_hours} hour(s)</li>
          </ul>
          <p>We look forward to seeing you at your session!</p>
        `;
        break;

      case 'cancelled':
        // Notify both parties
        recipientEmail = booking.student.email;
        recipientName = `${booking.student.first_name} ${booking.student.last_name}`;
        notificationUserId = booking.student_id;
        emailSubject = 'Booking Cancelled';
        emailHtml = `
          <h1>Booking Cancelled</h1>
          <p>Hi ${booking.student.first_name},</p>
          <p>Your tutoring session scheduled for ${new Date(booking.session_date).toLocaleString()} has been cancelled.</p>
          <p>If you have any questions, please contact support.</p>
        `;
        break;

      case 'completed':
        // Notify student to leave a review
        recipientEmail = booking.student.email;
        recipientName = `${booking.student.first_name} ${booking.student.last_name}`;
        notificationUserId = booking.student_id;
        emailSubject = 'Session Completed - Leave a Review';
        emailHtml = `
          <h1>How was your session?</h1>
          <p>Hi ${booking.student.first_name},</p>
          <p>Your tutoring session with ${booking.tutor.first_name} ${booking.tutor.last_name} is now complete!</p>
          <p>We'd love to hear about your experience. Please take a moment to leave a review.</p>
        `;
        break;
    }

    // Send email
    const { error: emailError } = await resend.emails.send({
      from: "TutorHub <onboarding@resend.dev>",
      to: [recipientEmail],
      subject: emailSubject,
      html: emailHtml,
    });

    if (emailError) {
      console.error('Email error:', emailError);
    }

    // Create in-app notification
    await supabase.from('notifications').insert({
      user_id: notificationUserId,
      type: 'booking',
      title: emailSubject,
      message: `Booking for ${booking.subject} on ${new Date(booking.session_date).toLocaleDateString()}`,
      link: '/dashboard',
    });

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error in send-booking-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
