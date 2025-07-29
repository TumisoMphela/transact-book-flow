import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Calendar, ArrowRight } from 'lucide-react';

export const BookingSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verifying, setVerifying] = useState(true);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (sessionId) {
      verifyPayment();
    }
  }, [sessionId]);

  const verifyPayment = async () => {
    try {
      await supabase.functions.invoke('verify-payment', {
        body: { sessionId }
      });
    } catch (error) {
      console.error('Payment verification failed:', error);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-secondary flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center shadow-elevated">
        <CardHeader>
          <div className="w-16 h-16 bg-success rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-success-foreground" />
          </div>
          <CardTitle className="text-2xl text-success">Payment Successful!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Your tutoring session has been booked and payment confirmed.
          </p>
          {verifying && (
            <p className="text-sm text-muted-foreground">Verifying payment...</p>
          )}
          <div className="space-y-3 pt-4">
            <Button onClick={() => navigate('/dashboard')} className="w-full">
              <Calendar className="h-4 w-4 mr-2" />
              View My Bookings
            </Button>
            <Button variant="outline" onClick={() => navigate('/')} className="w-full">
              <ArrowRight className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};