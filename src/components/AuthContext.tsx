import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom'; // ← Added
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast'; // ← Added

interface AuthContextType {
  user: User | null;
  profile: any | null;
  roles: string[];
  isAdmin: boolean;
  isTutor: boolean;
  isStudent: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  const navigate = useNavigate(); // ← Added

  const fetchProfile = async (userId: string) => {
    // ... your existing fetchProfile code
  };

  const fetchRoles = async (userId: string) => {
    // ... your existing fetchRoles code
  };

  const refreshProfile = async () => {
    // ... your existing refreshProfile code
  };

  useEffect(() => {
    let mounted = true;
    
    // ✅ ENHANCED: With email verification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        const user = session?.user;
        setUser(user ?? null);
        
        // CRITICAL: Check email verification
        if (user && !user.email_confirmed_at) {
          console.warn('[AUTH] Unverified user blocked:', user.email);
          await supabase.auth.signOut();
          setUser(null);
          setProfile(null);
          toast({
            title: "Email Verification Required",
            description: "Please verify your email before logging in.",
            variant: "destructive"
          });
          navigate('/auth/verify');
          setLoading(false);
          return;
        }
        
        if (user) {
          setTimeout(() => {
            if (mounted) fetchProfile(user.id);
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    // Fallback timeout
    const timeoutId = setTimeout(() => {
      if (mounted) {
        setLoading(false);
      }
    }, 1000);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setRoles([]);
  };

  const isAdmin = roles.includes('admin');
  const isTutor = roles.includes('tutor');
  const isStudent = roles.includes('student');

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      roles, 
      isAdmin, 
      isTutor, 
      isStudent, 
      loading, 
      signOut, 
      refreshProfile 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
