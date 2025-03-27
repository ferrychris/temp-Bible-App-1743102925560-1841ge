import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Mail, Shield, TriangleAlert as AlertTriangle, Check } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

interface BulkUserForm {
  emails: string;
  roles: string[];
}

const AVAILABLE_ROLES = ['admin', 'editor', 'user'];

export default function BulkUserCreationScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [results, setResults] = useState<Array<{ email: string; status: 'success' | 'error'; message: string }>>([]);
  const [formData, setFormData] = useState<BulkUserForm>({
    emails: '',
    roles: ['user'],
  });

  const validateEmails = (emails: string[]): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emails.every(email => emailRegex.test(email.trim()));
  };

  const handleCreateUsers = async () => {
    try {
      const emails = formData.emails
        .split('\n')
        .map(email => email.trim())
        .filter(email => email.length > 0);

      if (emails.length === 0) {
        setError('Please enter at least one email address');
        return;
      }

      if (!validateEmails(emails)) {
        setError('One or more email addresses are invalid');
        return;
      }

      setLoading(true);
      setError(null);
      setResults([]);

      // Process each email
      const processResults = await Promise.all(
        emails.map(async (email) => {
          try {
            // Generate a random password (this will be changed by the user)
            const tempPassword = Math.random().toString(36).slice(-12);

            // Create user in Supabase Auth
            const { data: userData, error: signUpError } = await supabase.auth.signUp({
              email,
              password: tempPassword,
              options: {
                data: {
                  roles: formData.roles,
                },
              },
            });

            if (signUpError) throw signUpError;

            // Create invitation
            const { error: inviteError } = await supabase
              .from('user_invitations')
              .insert({
                email,
                roles: formData.roles,
                invitation_token: Math.random().toString(36).slice(-32),
                invited_by: (await supabase.auth.getUser()).data.user?.id,
              });

            if (inviteError) throw inviteError;

            return {
              email,
              status: 'success' as const,
              message: 'Invitation sent successfully',
            };
          } catch (err) {
            console.error('Error processing user:', email, err);
            return {
              email,
              status: 'error' as const,
              message: err instanceof Error ? err.message : 'Failed to create user',
            };
          }
        })
      );

      setResults(processResults);

      const successCount = processResults.filter(r => r.status === 'success').length;
      if (successCount > 0) {
        setSuccess(`Successfully invited ${successCount} user${successCount > 1 ? 's' : ''}`);
        setFormData({
          emails: '',
          roles: ['user'],
        });

        // Navigate back after a delay if all were successful
        if (successCount === emails.length) {
          setTimeout(() => {
            router.back();
          }, 2000);
        }
      }
    } catch (err) {
      console.error('Error creating users:', err);
      setError(err instanceof Error ? err.message : 'Failed to create users');
    } finally {
      setLoading(false);
    }
  };

  const toggleRole = (role: string) => {
    setFormData(prev => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter(r => r !== role)
        : [...prev.roles, role]
    }));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable 
          style={styles.backButton} 
          onPress={() => router.back()}>
          <ArrowLeft size={24} color="#64748b" />
        </Pressable>
        <Text style={styles.title}>Bulk Create Users</Text>
      </View>

      <ScrollView style={styles.content}>
        {error && (
          <View style={styles.errorContainer}>
            <AlertTriangle size={20} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {success && (
          <View style={styles.successContainer}>
            <Check size={20} color="#10b981" />
            <Text style={styles.successText}>{success}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Email Addresses</Text>
          <Text style={styles.description}>
            Enter one email address per line. Users will receive an invitation email to complete their registration.
          </Text>
          
          <TextInput
            style={styles.emailInput}
            value={formData.emails}
            onChangeText={(text) => setFormData(prev => ({ ...prev, emails: text }))}
            placeholder="Enter email addresses..."
            multiline
            numberOfLines={12}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Roles</Text>
          <Text style={styles.description}>
            Select the roles to assign to all invited users.
          </Text>

          <View style={styles.rolesContainer}>
            {AVAILABLE_ROLES.map(role => (
              <Pressable
                key={role}
                style={[
                  styles.roleButton,
                  formData.roles.includes(role) && styles.roleButtonActive
                ]}
                onPress={() => toggleRole(role)}>
                <Shield 
                  size={20} 
                  color={formData.roles.includes(role) ? '#ffffff' : '#64748b'} 
                />
                <Text style={[
                  styles.roleButtonText,
                  formData.roles.includes(role) && styles.roleButtonTextActive
                ]}>
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {results.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Results</Text>
            <View style={styles.resultsList}>
              {results.map((result, index) => (
                <View 
                  key={index}
                  style={[
                    styles.resultItem,
                    result.status === 'success' ? styles.successItem : styles.errorItem
                  ]}>
                  <Text style={styles.resultEmail}>{result.email}</Text>
                  <Text style={[
                    styles.resultMessage,
                    result.status === 'success' ? styles.successMessage : styles.errorMessage
                  ]}>
                    {result.message}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.actions}>
          <Pressable 
            style={styles.cancelButton}
            onPress={() => router.back()}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>

          <Pressable 
            style={styles.createButton}
            onPress={handleCreateUsers}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.createButtonText}>Send Invitations</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: '#ef4444',
    fontSize: 14,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    gap: 8,
  },
  successText: {
    flex: 1,
    color: '#10b981',
    fontSize: 14,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  emailInput: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minHeight: 240,
  },
  rolesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 8,
  },
  roleButtonActive: {
    backgroundColor: '#6366f1',
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  roleButtonTextActive: {
    color: '#ffffff',
  },
  resultsList: {
    gap: 8,
  },
  resultItem: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  successItem: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  errorItem: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  resultEmail: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  resultMessage: {
    fontSize: 12,
  },
  successMessage: {
    color: '#10b981',
  },
  errorMessage: {
    color: '#ef4444',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 32,
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  createButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
  },
});