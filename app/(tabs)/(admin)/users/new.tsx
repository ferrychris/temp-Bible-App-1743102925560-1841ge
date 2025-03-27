import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Mail, User, Building2, Phone, Shield, Key } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { FormInput } from '@/components/FormInput';

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  department: string;
  phone: string;
  roles: string[];
  isActive: boolean;
  requireEmailVerification: boolean;
}

const AVAILABLE_ROLES = ['admin', 'editor', 'user'];

export default function NewUserScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    department: '',
    phone: '',
    roles: ['user'],
    isActive: true,
    requireEmailVerification: false,
  });

  const validateForm = (): boolean => {
    if (!formData.email || !formData.password) {
      setError('Email and password are required');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }

    return true;
  };

  const handleCreateUser = async () => {
    try {
      if (!validateForm()) return;

      setLoading(true);
      setError(null);

      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            department: formData.department,
            phone: formData.phone,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        // Assign roles
        const { error: rolesError } = await supabase.from('user_roles').insert(
          formData.roles.map(role => ({
            user_id: authData.user!.id,
            role_name: role,
            is_active: formData.isActive,
          }))
        );

        if (rolesError) throw rolesError;
      }

      router.back();
    } catch (err) {
      console.error('Error creating user:', err);
      setError(err instanceof Error ? err.message : 'Failed to create user');
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
        <Text style={styles.title}>New User</Text>
      </View>

      <ScrollView style={styles.content}>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          
          <FormInput
            label="Email"
            value={formData.email}
            onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
            placeholder="Enter email address"
            keyboardType="email-address"
            autoCapitalize="none"
            required
            icon={Mail}
          />

          <FormInput
            label="Password"
            value={formData.password}
            onChangeText={(text) => setFormData(prev => ({ ...prev, password: text }))}
            placeholder="Enter password"
            secureTextEntry
            required
            icon={Key}
          />

          <FormInput
            label="Confirm Password"
            value={formData.confirmPassword}
            onChangeText={(text) => setFormData(prev => ({ ...prev, confirmPassword: text }))}
            placeholder="Confirm password"
            secureTextEntry
            required
            icon={Key}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Details</Text>

          <FormInput
            label="Name"
            value={formData.name}
            onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
            placeholder="Enter full name"
            icon={User}
          />

          <FormInput
            label="Department"
            value={formData.department}
            onChangeText={(text) => setFormData(prev => ({ ...prev, department: text }))}
            placeholder="Enter department"
            icon={Building2}
          />

          <FormInput
            label="Phone"
            value={formData.phone}
            onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
            placeholder="Enter phone number"
            keyboardType="phone-pad"
            icon={Phone}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Roles & Permissions</Text>

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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Settings</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Account Status</Text>
              <Text style={styles.settingDescription}>
                Enable or disable user access
              </Text>
            </View>
            <Switch
              value={formData.isActive}
              onValueChange={(value) => 
                setFormData(prev => ({ ...prev, isActive: value }))
              }
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Email Verification</Text>
              <Text style={styles.settingDescription}>
                Require email verification before first login
              </Text>
            </View>
            <Switch
              value={formData.requireEmailVerification}
              onValueChange={(value) => 
                setFormData(prev => ({ ...prev, requireEmailVerification: value }))
              }
            />
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable 
            style={styles.cancelButton}
            onPress={() => router.back()}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>

          <Pressable 
            style={styles.createButton}
            onPress={handleCreateUser}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.createButtonText}>Create User</Text>
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
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 16,
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
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#64748b',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 32,
    marginBottom: 32,
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