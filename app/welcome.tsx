import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, Pressable, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Shield, ChevronRight, AlertCircle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

export default function WelcomeScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);

  useEffect(() => {
    checkUserStatus();
  }, []);

  const checkUserStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      // First check for existing session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) throw sessionError;
      if (!session) {
        router.replace('/');
        return;
      }

      const user = session.user;
      if (!user) {
        router.replace('/');
        return;
      }

      // Check email verification
      if (!user.email_confirmed_at) {
        setNeedsVerification(true);
        setLoading(false);
        return;
      }

      // Check if user already has a role
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('roles(name)')
        .eq('user_id', user.id)
        .single();

      if (rolesError && rolesError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        throw rolesError;
      }

      // If no role, assign guest role
      if (!userRoles) {
        const { data: guestRole, error: guestRoleError } = await supabase
          .from('roles')
          .select('id')
          .eq('name', 'user')
          .single();

        if (guestRoleError) throw guestRoleError;

        if (guestRole) {
          const { error: insertError } = await supabase.from('user_roles').insert({
            user_id: user.id,
            role_id: guestRole.id,
            is_active: true
          });

          if (insertError) throw insertError;
        }
      }

      // Redirect to home screen after successful setup
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Error checking user status:', error);
      setError(error instanceof Error ? error.message : 'Failed to complete setup');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session?.user?.email) throw new Error('No email address found');

      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: session.user.email,
      });

      if (resendError) throw resendError;

      setError('Verification email has been resent. Please check your inbox.');
    } catch (error) {
      console.error('Error resending verification:', error);
      setError(error instanceof Error ? error.message : 'Failed to resend verification email');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (needsVerification) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <AlertCircle size={48} color="#fbbf24" />
          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.message}>
            Please check your email for a verification link. You need to verify your email before continuing.
          </Text>
          <Pressable
            style={styles.button}
            onPress={handleResendVerification}
            disabled={loading}>
            <Text style={styles.buttonText}>Resend Verification Email</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <AlertCircle size={48} color="#ef4444" />
          <Text style={styles.title}>Setup Error</Text>
          <Text style={styles.message}>{error}</Text>
          <Pressable
            style={styles.button}
            onPress={checkUserStatus}>
            <Text style={styles.buttonText}>Try Again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Shield size={48} color="#6366f1" />
        <Text style={styles.title}>Welcome!</Text>
        <Text style={styles.message}>
          Your account is being set up. Please wait a moment...
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
});