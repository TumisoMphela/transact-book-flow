import React, { useEffect } from 'react';
import { useAuth } from '@/components/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, Users, Star, Calendar, GraduationCap, Award, MessageCircle, TrendingUp } from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Non-blocking redirect for authenticated users with delay to prevent flash
  useEffect(() => {
    let mounted = true;
    
    if (!loading && user && mounted) {
      const timeoutId = setTimeout(() => {
        if (mounted) navigate('/dashboard');
      }, 100);
      
      return () => {
        mounted = false;
        clearTimeout(timeoutId);
      };
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-gradient-secondary">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-xl font-bold">OUTLOOK Tutoring</h1>
          </div>
          <nav className="hidden md:flex gap-6">
            <Button variant="ghost" onClick={() => navigate('/tutors')}>Find Tutors</Button>
            <Button variant="ghost" onClick={() => navigate('/materials')}>Materials</Button>
            <Button variant="ghost" onClick={() => navigate('/academy')}>Academy</Button>
            <Button variant="ghost" onClick={() => navigate('/groups')}>Study Groups</Button>
            {user ? (
              <Button onClick={() => navigate('/dashboard')}>Dashboard</Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate('/auth')}>Login</Button>
                <Button onClick={() => navigate('/auth')}>Sign Up</Button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <div className="w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-8 shadow-elevated">
            <GraduationCap className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-education bg-clip-text text-transparent">
            OUTLOOK Tutoring
          </h1>
          <p className="text-2xl text-muted-foreground mb-4 max-w-2xl mx-auto">
            Connect with expert tutors and access quality learning materials
          </p>
          
          {/* Hero Stats */}
          <div className="flex gap-8 justify-center mb-12 text-sm text-muted-foreground">
            <div>
              <span className="font-bold text-primary text-2xl block">5,000+</span>
              <span>Expert Tutors</span>
            </div>
            <div>
              <span className="font-bold text-primary text-2xl block">50,000+</span>
              <span>Learning Materials</span>
            </div>
            <div>
              <span className="font-bold text-primary text-2xl block">98%</span>
              <span>Success Rate</span>
            </div>
          </div>
          
          <div className="flex gap-4 justify-center mb-20">
            <Button size="lg" onClick={() => navigate('/tutors')} className="px-8 h-12 text-lg">
              <Users className="mr-2 h-5 w-5" />
              Find a Tutor
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/materials')} className="h-12 text-lg">
              <BookOpen className="mr-2 h-5 w-5" />
              Browse Materials
            </Button>
          </div>

          {/* Features Grid - Detailed Feature Sections */}
          <div className="grid md:grid-cols-2 gap-12 mt-20">
            {/* Expert Tutors */}
            <Card className="hover:shadow-xl transition-all">
              <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <Star className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-bold text-2xl">Expert Tutors</h3>
                </div>
                <p className="text-muted-foreground mb-4">
                  Connect with verified, highly-rated tutors with years of teaching experience. 
                  All tutors are certified through our academy and specialize in their subjects.
                </p>
                <div className="flex gap-2 mb-4">
                  <Award className="w-5 h-5 text-primary shrink-0" />
                  <span className="text-sm">Verified & certified professionals</span>
                </div>
                <div className="flex gap-2 mb-4">
                  <Star className="w-5 h-5 text-primary shrink-0" />
                  <span className="text-sm">Top-rated with proven track records</span>
                </div>
                <div className="flex gap-2">
                  <GraduationCap className="w-5 h-5 text-primary shrink-0" />
                  <span className="text-sm">Extensive teaching experience</span>
                </div>
                <Button className="w-full mt-6" onClick={() => navigate('/tutors')}>
                  Browse All Tutors
                </Button>
              </CardContent>
            </Card>

            {/* Easy Booking */}
            <Card className="hover:shadow-xl transition-all">
              <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-bold text-2xl">Easy Booking</h3>
                </div>
                <p className="text-muted-foreground mb-6">
                  Book sessions in 3 simple steps. View real-time tutor availability 
                  and schedule at your convenience.
                </p>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center shrink-0 text-primary-foreground font-bold">1</div>
                    <div>
                      <p className="font-semibold">Select Your Tutor</p>
                      <p className="text-sm text-muted-foreground">Browse verified experts</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center shrink-0 text-primary-foreground font-bold">2</div>
                    <div>
                      <p className="font-semibold">Pick a Time Slot</p>
                      <p className="text-sm text-muted-foreground">View real-time availability</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center shrink-0 text-primary-foreground font-bold">3</div>
                    <div>
                      <p className="font-semibold">Confirm & Pay</p>
                      <p className="text-sm text-muted-foreground">Secure payment via Stripe</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Secure Payments */}
            <Card className="hover:shadow-xl transition-all">
              <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <Award className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-bold text-2xl">Secure Payments</h3>
                </div>
                <p className="text-muted-foreground mb-4">
                  All transactions are processed securely through Stripe. 
                  Your financial data is encrypted and never stored on our servers.
                </p>
                <div className="bg-accent/50 p-4 rounded-lg mb-4">
                  <p className="font-semibold mb-2">Powered by Stripe</p>
                  <p className="text-sm text-muted-foreground">
                    Industry-leading payment security with 256-bit SSL encryption and PCI DSS compliance.
                  </p>
                </div>
                <Button variant="outline" className="w-full" onClick={() => navigate('/dashboard/bookings')}>
                  View Your Bookings
                </Button>
              </CardContent>
            </Card>

            {/* Upload Materials */}
            <Card className="hover:shadow-xl transition-all">
              <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-bold text-2xl">Upload Materials</h3>
                </div>
                <p className="text-muted-foreground mb-4">
                  Share your study notes, guides, and resources. Earn 90% from every purchase.
                </p>
                <div className="bg-accent/50 p-4 rounded-lg mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold">Your earnings:</span>
                    <span className="text-2xl font-bold text-primary">90%</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Set your own prices. Get paid directly to your Stripe account.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={() => navigate('/materials')}>
                    Browse Materials
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => navigate('/dashboard/earnings')}>
                    View Earnings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* New Features Highlight */}
          <div className="grid md:grid-cols-3 gap-8 mt-20">
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
              <CardContent className="p-6">
                <Award className="w-10 h-10 mb-4 text-primary" />
                <h3 className="font-bold text-xl mb-2">Tutor Academy</h3>
                <p className="text-muted-foreground mb-4 text-sm">
                  Complete training courses to become a certified tutor and earn badges
                </p>
                <Button onClick={() => navigate('/academy')} variant="outline" className="w-full">
                  Start Training
                </Button>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
              <CardContent className="p-6">
                <Users className="w-10 h-10 mb-4 text-primary" />
                <h3 className="font-bold text-xl mb-2">Study Groups</h3>
                <p className="text-muted-foreground mb-4 text-sm">
                  Join WhatsApp-style groups for collaborative learning and peer support
                </p>
                <Button onClick={() => navigate('/groups')} variant="outline" className="w-full">
                  Join a Group
                </Button>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
              <CardContent className="p-6">
                <BookOpen className="w-10 h-10 mb-4 text-primary" />
                <h3 className="font-bold text-xl mb-2">Upload & Earn</h3>
                <p className="text-muted-foreground mb-4 text-sm">
                  Share your study materials and earn 90% from every purchase
                </p>
                <Button onClick={() => navigate('/materials')} variant="outline" className="w-full">
                  Browse Materials
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-card/30 backdrop-blur-sm mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">© 2025 OUTLOOK Tutoring. All rights reserved.</p>
            <div className="flex gap-6">
              <Button variant="link" className="text-sm">Privacy Policy</Button>
              <Button variant="link" className="text-sm">Terms of Use</Button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
