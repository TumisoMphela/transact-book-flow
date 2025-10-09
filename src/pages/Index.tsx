import React, { useEffect } from 'react';
import { useAuth } from '@/components/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { BookOpen, Users, Star, Calendar } from 'lucide-react';

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirect authenticated users to dashboard, but don't block UI during auth check
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      {/* Navigation */}
      <nav className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-blue-600 rounded-lg flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold">OutLook</span>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => navigate('/auth')}>
              Sign In
            </Button>
            <Button onClick={() => navigate('/auth')}>
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
            <Star className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Trusted by 1000+ students</span>
          </div>
          
          <h1 className="text-6xl md:text-7xl font-bold mb-6 leading-tight">
            Learn from the{' '}
            <span className="bg-gradient-to-r from-primary via-blue-500 to-purple-600 bg-clip-text text-transparent">
              best tutors
            </span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
            Connect with expert tutors, book sessions instantly, and achieve your learning goals. 
            Secure payments and integrated calendar make learning seamless.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-20">
            <Button size="lg" onClick={() => navigate('/auth')} className="px-8 py-6 text-lg">
              Start Learning Today
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/auth')} className="px-8 py-6 text-lg">
              Become a Tutor
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mb-20 max-w-3xl mx-auto">
            <div>
              <div className="text-4xl font-bold text-primary mb-2">500+</div>
              <div className="text-sm text-muted-foreground">Expert Tutors</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">10k+</div>
              <div className="text-sm text-muted-foreground">Sessions Completed</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">4.9★</div>
              <div className="text-sm text-muted-foreground">Average Rating</div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8">
            <div className="group text-center p-8 rounded-2xl bg-card border border-border hover:border-primary/50 hover:shadow-elevated transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Expert Tutors</h3>
              <p className="text-muted-foreground">Connect with verified tutors across all subjects. Mathematics, Science, Languages & more.</p>
            </div>
            
            <div className="group text-center p-8 rounded-2xl bg-card border border-border hover:border-primary/50 hover:shadow-elevated transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <Calendar className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Easy Booking</h3>
              <p className="text-muted-foreground">Schedule sessions with our integrated calendar system. Pick your time, we handle the rest.</p>
            </div>
            
            <div className="group text-center p-8 rounded-2xl bg-card border border-border hover:border-primary/50 hover:shadow-elevated transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <Star className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Secure & Safe</h3>
              <p className="text-muted-foreground">Secure payment processing with Stripe. Your data and payments are always protected.</p>
            </div>
          </div>

          {/* CTA Section */}
          <div className="mt-24 p-12 rounded-3xl bg-gradient-to-br from-primary/10 via-blue-500/10 to-purple-600/10 border border-primary/20">
            <h2 className="text-3xl font-bold mb-4">Ready to start learning?</h2>
            <p className="text-lg text-muted-foreground mb-8">Join thousands of students already learning with OutLook</p>
            <Button size="lg" onClick={() => navigate('/auth')} className="px-8 py-6 text-lg">
              Get Started Free
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 mt-20 border-t border-border">
        <div className="text-center text-sm text-muted-foreground">
          <p>© 2025 OutLook Tutoring. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
