import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { GraduationCap, Mail, AlertCircle } from 'lucide-react';

export const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    userType: 'student'
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('[AUTH] Attempting sign in for:', formData.email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        console.error('[AUTH] Sign in error:', error);
        throw error;
      }

      console.log('[AUTH] Sign in successful. Email confirmed:', !!data.user?.email_confirmed_at);

      // Skip email confirmation check for easier testing
      // To re-enable: Go to Supabase Dashboard → Authentication → Settings → "Enable email confirmations"
      // if (data.user && !data.user.email_confirmed_at) {
      //   await supabase.auth.signOut();
      //   navigate(`/auth/verify?email=${encodeURIComponent(formData.email)}`);
      //   toast({
      //     title: "Email Verification Required",
      //     description: "Please verify your email before signing in.",
      //     variant: "destructive"
      //   });
      //   return;
      // }
      
      console.log('[AUTH] User authenticated successfully');
      toast({
        title: "Welcome back!",
        description: "Successfully signed in.",
      });

      // AuthContext will handle redirect to dashboard
    } catch (error: any) {
      handleAuthError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('[AUTH] Attempting sign up for:', formData.email);
      
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            user_type: formData.userType,
          }
        }
      });

      if (error) {
        console.error('[AUTH] Sign up error:', error);
        throw error;
      }

      console.log('[AUTH] Sign up successful. User ID:', data.user?.id);

      toast({
        title: "Account Created!",
        description: "You can now sign in with your credentials.",
      });

      // Auto sign in after successful signup
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (signInError) {
        console.error('[AUTH] Auto sign-in failed:', signInError);
        navigate('/auth'); // Redirect to login
      }
      // AuthContext will handle navigation to dashboard
    } catch (error: any) {
      handleAuthError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthError = (error: any) => {
    console.error('[AUTH] Error:', error);
    
    let title = "Authentication Failed";
    let description = error.message;

    if (error.message?.includes("Invalid login credentials")) {
      title = "Invalid Credentials";
      description = "Please check your email and password.";
    } else if (error.message?.includes("Email rate limit exceeded")) {
      title = "Too Many Attempts";
      description = "Please wait a few minutes before trying again.";
    } else if (error.message?.includes("User already registered")) {
      title = "Account Already Exists";
      description = "This email is already registered. Please sign in instead.";
    } else if (error.message?.includes("SMTP") || error.message?.includes("email service")) {
      title = "Email Service Error";
      description = "There's an issue with the email service. Please contact support.";
    }

    toast({
      title,
      description,
      variant: "destructive"
    });
  };

  return (
    <div className="min-h-screen bg-gradient-secondary flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-elevated">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-education/20 rounded-full flex items-center justify-center mb-4">
            <GraduationCap className="h-8 w-8 text-education" />
          </div>
          <CardTitle className="text-3xl font-bold text-foreground">OUTLOOK</CardTitle>
          <p className="text-lg text-muted-foreground font-medium">Tutoring</p>
          <p className="text-sm text-muted-foreground mt-2">Connect with expert tutors</p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="your.email@example.com"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Signing In...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      placeholder="John"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      placeholder="Doe"
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="your.email@example.com"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder="••••••••"
                    minLength={6}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Minimum 6 characters
                  </p>
                </div>
                <div>
                  <Label htmlFor="userType">I am a...</Label>
                  <Select value={formData.userType} onValueChange={(value) => handleInputChange('userType', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="tutor">Tutor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
