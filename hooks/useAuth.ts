import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';

export function useAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN') {
          if (session?.user) {
            setUser(session.user);
            setIsLoading(false);
            
            // Check if email is verified
            if (!session.user.email_confirmed_at) {
              setError('Please verify your email address to access all features.');
            }
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setIsLoading(false);
          router.replace('/');
        } else if (event === 'TOKEN_REFRESHED') {
          // Handle token refresh
          if (session?.user) {
            setUser(session.user);
          }
        } else if (event === 'USER_UPDATED') {
          // Handle user data updates
          if (session?.user) {
            setUser(session.user);
          }
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) throw sessionError;

      if (session?.user) {
        setUser(session.user);
        
        // Check if session is expired
        const expiresAt = new Date(session.expires_at || 0).getTime();
        const now = Date.now();
        
        if (expiresAt < now) {
          // Session expired, sign out
          await signOut();
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Error checking user:', error);
      setError(error instanceof Error ? error.message : 'Failed to check authentication status');
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      if (!data.session?.user?.email_confirmed_at) {
        setError('Please verify your email address to access all features.');
      }

      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sign in';
      setError(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      
      setUser(null);
      router.replace('/');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sign out';
      setError(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    user,
    isLoading,
    error,
    signIn,
    signOut,
  };
}