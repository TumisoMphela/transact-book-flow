// src/pages/AuthVerify.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Clock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export const AuthVerify: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const [cooldown, setCooldown] = useState(0);

  // If already verified, redirect
  useEffect(() => {
    if (user?.email_confirmed_at) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleResend = async () => {
    if (cooldown > 0 || !email) return;

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email
      });

      if (error) throw error;

      toast({
        title: "Verification Email Sent",
        description: "Please check your inbox and spam folder."
      });

      setCooldown(60);
    } catch (error: any) {
      toast({
        title: "Failed to Resend",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  return (
    <div className="min-h-screen bg-gradient-secondary flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-center">Verify Your Email</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            We've sent a verification link to <strong>{email}</strong>
          </p>
          <p className="text-sm text-center text-muted-foreground">
            Please check your inbox and spam folder, then click the link to verify your account.
          </p>
          
          <Button
            onClick={handleResend}
            disabled={cooldown > 0}
            variant="outline"
            className="w-full"
          >
            {cooldown > 0 ? (
              <>
                <Clock className="mr-2 h-4 w-4" />
                Resend in {cooldown}s
              </>
            ) : (
              'Resend Verification Email'
            )}
          </Button>

          <Button
            onClick={() => navigate('/auth')}
            variant="ghost"
            className="w-full"
          >
            Back to Login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
