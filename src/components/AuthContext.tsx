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
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch roles after profile
      await fetchRoles(userId);
    } catch (error) {
      console.error('[AUTH] Error fetching profile:', error);
      setProfile(null);
    }
  };

  const fetchRoles = async (userId: string) => {
    try {
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (rolesError) throw rolesError;
      setRoles(rolesData?.map((r: any) => r.role) || []);
    } catch (error) {
      console.error('[AUTH] Error fetching roles:', error);
      setRoles([]);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    let mounted = true;
    
    // ✅ ENHANCED: With email verification and error handling
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

    // Check for existing session with error handling
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return;
      
      // If there's an auth error (e.g., invalid refresh token), clear the session
      if (error) {
        console.error('[AUTH] Session error:', error.message);
        supabase.auth.signOut(); // Clear invalid session
        setUser(null);
        setProfile(null);
        setRoles([]);
        setLoading(false);
        return;
      }
      
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    }).catch((err) => {
      // Handle any unexpected errors during session retrieval
      console.error('[AUTH] Unexpected error:', err);
      if (mounted) {
        setUser(null);
        setProfile(null);
        setRoles([]);
        setLoading(false);
      }
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
