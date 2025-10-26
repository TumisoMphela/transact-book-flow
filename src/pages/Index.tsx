import React, { useEffect } from 'react';
import { useAuth } from '@/components/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { BookOpen, Users, Star, Calendar, GraduationCap } from 'lucide-react';

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

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <div className="text-center p-8 rounded-xl bg-card shadow-card hover:shadow-elevated transition-shadow">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Expert Tutors</h3>
              <p className="text-muted-foreground">Connect with qualified tutors across all subjects and skill levels</p>
            </div>
            <div className="text-center p-8 rounded-xl bg-card shadow-card hover:shadow-elevated transition-shadow">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Easy Booking</h3>
              <p className="text-muted-foreground">Schedule sessions seamlessly with our integrated calendar system</p>
            </div>
            <div className="text-center p-8 rounded-xl bg-card shadow-card hover:shadow-elevated transition-shadow">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Secure Payments</h3>
              <p className="text-muted-foreground">Safe and secure payment processing powered by Stripe</p>
            </div>
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
