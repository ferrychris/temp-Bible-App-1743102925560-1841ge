import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft, Mail, User, Building2, Phone, Shield, Key, Trash2, History } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { FormInput } from '@/components/FormInput';

interface UserDetails {
  id: string;
  email: string;
  user_metadata: {
    name?: string;
    department?: string;
    phone?: string;
  };
  created_at: string;
  last_sign_in_at: string | null;
  is_active: boolean;
  roles: string[];
}

const AVAILABLE_ROLES = ['admin', 'editor', 'user'];

export default function UserDetailsScreen() {
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<UserDetails | null>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    fetchUserDetails();
  }, [id]);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select(`
          *,
          user_roles (
            roles (name)
          )
        `)
        .eq('id', id)
        .single();

      if (userError) throw userError;
      if (userData) {
        setUser({
          ...userData,
          roles: userData.user_roles?.map(ur => ur.roles.name) || [],
        });
      }
    } catch (err) {
      console.error('Error fetching user:', err);
      setError('Failed to load user details');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setSaving(true);
      setError(null);

      // Update user metadata
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        {
          user_metadata: user.user_metadata,
          email: user.email,
        }
      );

      if (updateError) throw updateError;

      // Update roles
      const { error: rolesError } = await supabase
        .from('user_roles')
        .upsert(
          user.roles.map(role => ({
            user_id: user.id,
            role_name: role,
            is_active: user.is_active,
          }))
        );

      if (rolesError) throw rolesError;

      router.back();
    } catch (err) {
      console.error('Error updating user:', err);
      setError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;

    try {
      Alert.alert(
        'Delete User',
        'Are you sure you want to delete this user? This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                setDeleting(true);
                setError(null);

                const { error: deleteError } = await supabase.auth.admin.deleteUser(
                  user.id
                );

                if (deleteError) throw deleteError;

                router.back();
              } catch (err) {
                console.error('Error deleting user:', err);
                setError(err instanceof Error ? err.message : 'Failed to delete user');
              } finally {
                setDeleting(false);
              }
            },
          },
        ],
        { cancelable: true }
      );
    } catch (err) {
      console.error('Error in delete handler:', err);
      setError(err instanceof Error ? err.message : 'Failed to process deletion');
    }
  };

  const handleChangePassword = async () => {
    try {
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      if (passwordForm.newPassword.length < 8) {
        setError('Password must be at least 8 characters long');
        return;
      }

      setSaving(true);
      setError(null);

      const { error: updateError } = await supabase.auth.admin.updateUserById(
        user!.id,
        { password: passwordForm.newPassword }
      );

      if (updateError) throw updateError;

      setShowChangePassword(false);
      setPasswordForm({
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err) {
      console.error('Error changing password:', err);
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const toggleRole = (role: string) => {
    if (!user) return;

    setUser(prev => {
      if (!prev) return prev;

      return {
        ...prev,
        roles: prev.roles.includes(role)
          ? prev.roles.filter(r => r !== role)
          : [...prev.roles, role]
      };
    });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>User not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable 
          style={styles.backButton} 
          onPress={() => router.back()}>
          <ArrowLeft size={24} color="#64748b" />
        </Pressable>
        <Text style={styles.title}>Edit User</Text>
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
            value={user.email}
            onChangeText={(text) => setUser(prev => ({ 
              ...prev!,
              email: text 
            }))}
            placeholder="Enter email address"
            keyboardType="email-address"
            autoCapitalize="none"
            required
            icon={Mail}
          />

          {showChangePassword ? (
            <View style={styles.passwordForm}>
              <FormInput
                label="New Password"
                value={passwordForm.newPassword}
                onChangeText={(text) => setPasswordForm(prev => ({
                  ...prev,
                  newPassword: text
                }))}
                placeholder="Enter new password"
                secureTextEntry
                required
                icon={Key}
              />

              <FormInput
                label="Confirm Password"
                value={passwordForm.confirmPassword}
                onChangeText={(text) => setPasswordForm(prev => ({
                  ...prev,
                  confirmPassword: text
                }))}
                placeholder="Confirm new password"
                secureTextEntry
                required
                icon={Key}
              />

              <View style={styles.passwordActions}>
                <Pressable
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => {
                    setShowChangePassword(false);
                    setPasswordForm({
                      newPassword: '',
                      confirmPassword: '',
                    });
                  }}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>

                <Pressable
                  style={[styles.button, styles.saveButton]}
                  onPress={handleChangePassword}
                  disabled={saving}>
                  {saving ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={styles.saveButtonText}>Change Password</Text>
                  )}
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              style={styles.changePasswordButton}
              onPress={() => setShowChangePassword(true)}>
              <Key size={20} color="#6366f1" />
              <Text style={styles.changePasswordText}>Change Password</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Details</Text>

          <FormInput
            label="Name"
            value={user.user_metadata.name}
            onChangeText={(text) => setUser(prev => ({
              ...prev!,
              user_metadata: { ...prev!.user_metadata, name: text }
            }))}
            placeholder="Enter full name"
            icon={User}
          />

          <FormInput
            label="Department"
            value={user.user_metadata.department}
            onChangeText={(text) => setUser(prev => ({
              ...prev!,
              user_metadata: { ...prev!.user_metadata, department: text }
            }))}
            placeholder="Enter department"
            icon={Building2}
          />

          <FormInput
            label="Phone"
            value={user.user_metadata.phone}
            onChangeText={(text) => setUser(prev => ({
              ...prev!,
              user_metadata: { ...prev!.user_metadata, phone: text }
            }))}
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
                  user.roles.includes(role) && styles.roleButtonActive
                ]}
                onPress={() => toggleRole(role)}>
                <Shield 
                  size={20} 
                  color={user.roles.includes(role) ? '#ffffff' : '#64748b'} 
                />
                <Text style={[
                  styles.roleButtonText,
                  user.roles.includes(role) && styles.roleButtonTextActive
                ]}>
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Status</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Account Status</Text>
              <Text style={styles.settingDescription}>
                Enable or disable user access
              </Text>
            </View>
            <Switch
              value={user.is_active}
              onValueChange={(value) => setUser(prev => ({
                ...prev!,
                is_active: value
              }))}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account History</Text>

          <View style={styles.historyItem}>
            <History size={20} color="#64748b" />
            <View style={styles.historyInfo}>
              <Text style={styles.historyLabel}>Created</Text>
              <Text style={styles.historyValue}>
                {new Date(user.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>

          <View style={styles.historyItem}>
            <History size={20} color="#64748b" />
            <View style={styles.historyInfo}>
              <Text style={styles.historyLabel}>Last Login</Text>
              <Text style={styles.historyValue}>
                {user.last_sign_in_at
                  ? new Date(user.last_sign_in_at).toLocaleDateString()
                  : 'Never'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.dangerZone}>
          <Text style={styles.dangerZoneTitle}>Danger Zone</Text>
          <Pressable
            style={styles.deleteButton}
            onPress={handleDelete}
            disabled={deleting}>
            {deleting ? (
              <ActivityIndicator color="#ef4444" size="small" />
            ) : (
              <>
                <Trash2 size={20} color="#ef4444" />
                <Text style={styles.deleteButtonText}>Delete User</Text>
              </>
            )}
          </Pressable>
        </View>

        <View style={styles.actions}>
          <Pressable 
            style={[styles.button, styles.cancelButton]}
            onPress={() => router.back()}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>

          <Pressable 
            style={[styles.button, styles.saveButton]}
            onPress={handleSave}
            disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  changePasswordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  changePasswordText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6366f1',
  },
  passwordForm: {
    gap: 16,
  },
  passwordActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
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
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    gap: 12,
  },
  historyInfo: {
    flex: 1,
  },
  historyLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  historyValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
  },
  dangerZone: {
    marginTop: 32,
    marginBottom: 32,
    padding: 16,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  dangerZoneTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
    marginBottom: 16,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ef4444',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginBottom: 32,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  saveButton: {
    backgroundColor: '#6366f1',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
  },
});