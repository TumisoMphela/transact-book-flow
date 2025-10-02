import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { GraduationCap, UserCheck, Mail, AlertCircle } from 'lucide-react';

export const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      // Check if email is confirmed
      if (data.user && !data.user.email_confirmed_at) {
        setShowEmailVerification(true);
        setPendingEmail(formData.email);
        await supabase.auth.signOut(); // Sign out unconfirmed user
        toast({
          title: "Email Verification Required",
          description: "Please verify your email address before signing in.",
          variant: "destructive"
        });
        return;
      }
      
      toast({
        title: "Welcome back!",
        description: "Successfully signed in.",
      });
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
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            user_type: formData.userType,
          }
        }
      });

      if (error) throw error;

      setShowEmailVerification(true);
      setPendingEmail(formData.email);
      toast({
        title: "Account Created!",
        description: "Please check your email to verify your account before signing in.",
      });
    } catch (error: any) {
      handleAuthError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!pendingEmail) return;
    
    setResendLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: pendingEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) throw error;

      toast({
        title: "Email Sent",
        description: "Verification email has been resent. Please check your inbox.",
      });
    } catch (error: any) {
      toast({
        title: "Failed to Resend Email",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setResendLoading(false);
    }
  };

  const handleAuthError = (error: any) => {
    let title = "Authentication Failed";
    let description = error.message;

    if (error.message.includes("email not confirmed")) {
      title = "Email Verification Required";
      description = "Please verify your email address before signing in.";
      setShowEmailVerification(true);
    } else if (error.message.includes("Invalid login credentials")) {
      title = "Invalid Credentials";
      description = "Please check your email and password.";
    } else if (error.message.includes("Email rate limit exceeded")) {
      title = "Too Many Attempts";
      description = "Please wait before trying again.";
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
          {showEmailVerification && (
            <Alert className="mb-4">
              <Mail className="h-4 w-4" />
              <AlertDescription className="flex flex-col gap-2">
                <span>
                  We've sent a verification email to <strong>{pendingEmail}</strong>. 
                  Please check your inbox and click the verification link to activate your account.
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleResendVerification}
                  disabled={resendLoading}
                  className="self-start"
                >
                  {resendLoading ? 'Sending...' : 'Resend Email'}
                </Button>
              </AlertDescription>
            </Alert>
          )}
          
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
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
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
                    required
                  />
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