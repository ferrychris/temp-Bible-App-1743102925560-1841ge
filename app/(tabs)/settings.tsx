import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Pressable, TextInput, ActivityIndicator, Image, Alert } from 'react-native';
import { router } from 'expo-router';
import { Bell, Globe, Lock, LogOut, Moon, Settings2, Volume2, Mail, Key, User, Shield, ChevronRight, Phone, MapPin, CircleAlert as AlertTriangle, CreditCard as Edit2 } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { FormInput } from '@/components/FormInput';
import { ProfileImagePicker } from '@/components/ImagePicker';
import { SafeAreaView } from 'react-native-safe-area-context';

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function SettingsScreen() {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [isEditing, setIsEditing] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    city: '',
    state: '',
    country: '',
    name: '',
    bio: '',
    profile_picture_url: '',
  });
  const [passwordForm, setPasswordForm] = useState<PasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        setFormData(prev => ({
          ...prev,
          email: user.email || '',
          name: user.user_metadata?.name || '',
          bio: user.user_metadata?.bio || '',
          phone: user.user_metadata?.phone || '',
          city: user.user_metadata?.city || '',
          state: user.user_metadata?.state || '',
          country: user.user_metadata?.country || '',
          profile_picture_url: user.user_metadata?.profile_picture_url || '',
        }));
      }
    } catch (error) {
      console.error('Error checking user:', error);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Basic phone number validation
      if (formData.phone) {
        const phoneRegex = /^\+?[\d\s-()]{10,}$/;
        if (!phoneRegex.test(formData.phone)) {
          throw new Error('Please enter a valid phone number');
        }
      }

      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          name: formData.name,
          bio: formData.bio,
          phone: formData.phone,
          city: formData.city,
          state: formData.state,
          country: formData.country,
          profile_picture_url: formData.profile_picture_url,
        }
      });

      if (updateError) throw updateError;

      setSuccess('Profile updated successfully');
      setIsEditing(false);
      checkUser(); // Refresh user data
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate password requirements
      if (passwordForm.newPassword.length < 8) {
        throw new Error('New password must be at least 8 characters long');
      }

      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        throw new Error('New passwords do not match');
      }

      // First verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordForm.currentPassword,
      });

      if (signInError) {
        throw new Error('Current password is incorrect');
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });

      if (updateError) throw updateError;

      setSuccess('Password updated successfully');
      setShowChangePassword(false);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProfilePictureChange = (url: string | null) => {
    setFormData(prev => ({
      ...prev,
      profile_picture_url: url || '',
    }));
  };

  const handleAuth = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    setNeedsEmailConfirmation(false);

    try {
      if (authMode === 'signup') {
        if (formData.password !== formData.confirmPassword) {
          throw new Error('Passwords do not match');
        }

        if (!formData.phone) {
          throw new Error('Phone number is required');
        }

        // Basic phone number validation
        const phoneRegex = /^\+?[\d\s-()]{10,}$/;
        if (!phoneRegex.test(formData.phone)) {
          throw new Error('Please enter a valid phone number');
        }

        // Only include location data if provided
        const metadata: any = {
          phone: formData.phone,
        };

        if (formData.city) metadata.city = formData.city;
        if (formData.state) metadata.state = formData.state;
        if (formData.country) metadata.country = formData.country;

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: metadata,
            emailRedirectTo: 'myapp://auth/callback',
          },
        });

        if (signUpError) {
          if (signUpError.message.includes('User already registered')) {
            throw new Error('This email is already registered. Please sign in instead.');
          }
          throw signUpError;
        }

        if (!data?.user) {
          throw new Error('Failed to create account. Please try again.');
        }

        // Check if email verification is required
        if (!data.user.email_confirmed_at) {
          setNeedsEmailConfirmation(true);
          setSuccess('Account created successfully! Please check your email to verify your account.');
          setError('You need to verify your email before signing in. Check your inbox for the confirmation link.');
          return;
        }

        // If email is already verified, proceed to welcome screen
        router.replace('/welcome');
        return;
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (signInError) {
          if (signInError.message.includes('email_not_confirmed')) {
            setNeedsEmailConfirmation(true);
            setError('Please confirm your email address before signing in. Check your inbox for the confirmation link.');
            return;
          }
          if (signInError.message.includes('Invalid login credentials')) {
            throw new Error('Invalid email or password. Please try again.');
          }
          throw signInError;
        }
        setShowAuth(false);
        checkUser();
      }
    } catch (error: any) {
      setError(error.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resendConfirmationEmail = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: formData.email,
      });
      
      if (error) throw error;
      
      setSuccess('Confirmation email has been resent. Please check your inbox.');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
    } catch (error: any) {
      console.error('Error signing out:', error);
    }
  };

  if (showAuth) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => setShowAuth(false)}>
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
          <Text style={styles.title}>
            {authMode === 'signin' ? 'Sign In' : 'Create Account'}
          </Text>
        </View>

        <ScrollView style={styles.authContainer}>
          {error && (
            <View style={styles.errorContainer}>
              <AlertTriangle size={20} color="#ef4444" style={styles.errorIcon} />
              <Text style={styles.errorText}>{error}</Text>
              {needsEmailConfirmation && (
                <Pressable
                  style={styles.resendButton}
                  onPress={resendConfirmationEmail}
                  disabled={loading}>
                  <Text style={styles.resendButtonText}>
                    {loading ? 'Sending...' : 'Resend confirmation email'}
                  </Text>
                </Pressable>
              )}
            </View>
          )}

          {success && (
            <View style={styles.successContainer}>
              <Text style={styles.successText}>{success}</Text>
            </View>
          )}

          <View style={styles.formField}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              placeholder="Enter your email"
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.formField}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={formData.password}
              onChangeText={(text) => setFormData({ ...formData, password: text })}
              placeholder="Enter your password"
              secureTextEntry
            />
          </View>

          {authMode === 'signup' && (
            <>
              <View style={styles.formField}>
                <Text style={styles.label}>Confirm Password</Text>
                <TextInput
                  style={styles.input}
                  value={formData.confirmPassword}
                  onChangeText={(text) =>
                    setFormData({ ...formData, confirmPassword: text })
                  }
                  placeholder="Confirm your password"
                  secureTextEntry
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.label}>
                  Phone Number<Text style={styles.required}> *</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={formData.phone}
                  onChangeText={(text) => setFormData({ ...formData, phone: text })}
                  placeholder="Enter your phone number"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.label}>City (Optional)</Text>
                <TextInput
                  style={styles.input}
                  value={formData.city}
                  onChangeText={(text) => setFormData({ ...formData, city: text })}
                  placeholder="Enter your city"
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.label}>State (Optional)</Text>
                <TextInput
                  style={styles.input}
                  value={formData.state}
                  onChangeText={(text) => setFormData({ ...formData, state: text })}
                  placeholder="Enter your state"
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.label}>Country (Optional)</Text>
                <TextInput
                  style={styles.input}
                  value={formData.country}
                  onChangeText={(text) => setFormData({ ...formData, country: text })}
                  placeholder="Enter your country"
                />
              </View>
            </>
          )}

          <Pressable
            style={[styles.authButton, loading && styles.authButtonDisabled]}
            onPress={handleAuth}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.authButtonText}>
                {authMode === 'signin' ? 'Sign In' : 'Create Account'}
              </Text>
            )}
          </Pressable>

          <Pressable
            style={styles.switchModeButton}
            onPress={() =>
              setAuthMode(authMode === 'signin' ? 'signup' : 'signin')
            }>
            <Text style={styles.switchModeText}>
              {authMode === 'signin'
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'}
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>

        {!user ? (
          <View style={styles.authPrompt}>
            <Shield size={48} color="#6366f1" />
            <Text style={styles.authPromptTitle}>Sign in to your account</Text>
            <Text style={styles.authPromptText}>
              Sign in to access all features and manage your content
            </Text>
            <Pressable
              style={styles.authPromptButton}
              onPress={() => setShowAuth(true)}>
              <Text style={styles.authPromptButtonText}>Sign In</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.userSection}>
              <View style={styles.profileHeader}>
                <ProfileImagePicker
                  value={formData.profile_picture_url}
                  onChange={handleProfilePictureChange}
                  size={100}
                />
                {isEditing ? (
                  <View style={styles.editForm}>
                    <FormInput
                      label="Name"
                      value={formData.name}
                      onChangeText={(text) => setFormData({ ...formData, name: text })}
                      placeholder="Enter your name"
                    />
                    <FormInput
                      label="Bio"
                      value={formData.bio}
                      onChangeText={(text) => setFormData({ ...formData, bio: text })}
                      placeholder="Tell us about yourself"
                      multiline
                      numberOfLines={3}
                    />
                    <FormInput
                      label="Phone Number"
                      value={formData.phone}
                      onChangeText={(text) => setFormData({ ...formData, phone: text })}
                      placeholder="Enter your phone number"
                      keyboardType="phone-pad"
                    />
                    <View style={styles.editActions}>
                      <Pressable
                        style={[styles.editButton, styles.cancelButton]}
                        onPress={() => setIsEditing(false)}>
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.editButton, styles.saveButton]}
                        onPress={handleUpdateProfile}
                        disabled={loading}>
                        {loading ? (
                          <ActivityIndicator color="#ffffff" size="small" />
                        ) : (
                          <Text style={styles.saveButtonText}>Save Changes</Text>
                        )}
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <View style={styles.profileInfo}>
                    <View style={styles.nameContainer}>
                      <Text style={styles.userName}>{formData.name || user.email}</Text>
                      <Pressable
                        style={styles.editIconButton}
                        onPress={() => setIsEditing(true)}>
                        <Edit2 size={16} color="#6366f1" />
                      </Pressable>
                    </View>
                    <Text style={styles.userEmail}>{user.email}</Text>
                    <Text style={styles.userBio}>{formData.bio || 'No bio added yet'}</Text>
                  </View>
                )}
              </View>

              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {success && (
                <View style={styles.successContainer}>
                  <Text style={styles.successText}>{success}</Text>
                </View>
              )}

              {!isEditing && (
                <>
                  {user.email && (
                    <View style={styles.userMetadata}>
                      <Mail size={16} color="#6366f1" />
                      <Text style={styles.metadataText}>{user.email}</Text>
                    </View>
                  )}
                  {formData.phone && (
                    <View style={styles.userMetadata}>
                      <Phone size={16} color="#6366f1" />
                      <Text style={styles.metadataText}>{formData.phone}</Text>
                    </View>
                  )}
                  {formData.city && (
                    <View style={styles.userMetadata}>
                      <MapPin size={16} color="#6366f1" />
                      <Text style={styles.metadataText}>
                        {[
                          formData.city,
                          formData.state,
                          formData.country,
                        ]
                          .filter(Boolean)
                          .join(', ')}
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Security</Text>
              <View style={styles.settingsList}>
                {showChangePassword ? (
                  <View style={styles.changePasswordForm}>
                    <FormInput
                      label="Current Password"
                      value={passwordForm.currentPassword}
                      onChangeText={(text) => 
                        setPasswordForm(prev => ({ ...prev, currentPassword: text }))
                      }
                      placeholder="Enter current password"
                      secureTextEntry
                    />
                    <FormInput
                      label="New Password"
                      value={passwordForm.newPassword}
                      onChangeText={(text) => 
                        setPasswordForm(prev => ({ ...prev, newPassword: text }))
                      }
                      placeholder="Enter new password"
                      secureTextEntry
                    />
                    <FormInput
                      label="Confirm New Password"
                      value={passwordForm.confirmPassword}
                      onChangeText={(text) => 
                        setPasswordForm(prev => ({ ...prev, confirmPassword: text }))
                      }
                      placeholder="Confirm new password"
                      secureTextEntry
                    />
                    <View style={styles.passwordActions}>
                      <Pressable
                        style={[styles.passwordButton, styles.cancelButton]}
                        onPress={() => {
                          setShowChangePassword(false);
                          setPasswordForm({
                            currentPassword: '',
                            newPassword: '',
                            confirmPassword: '',
                          });
                        }}>
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.passwordButton, styles.saveButton]}
                        onPress={handleChangePassword}
                        disabled={loading}>
                        {loading ? (
                          <ActivityIndicator color="#ffffff" size="small" />
                        ) : (
                          <Text style={styles.saveButtonText}>Update Password</Text>
                        )}
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable 
                    style={styles.settingItem}
                    onPress={() => setShowChangePassword(true)}>
                    <View style={styles.settingLeft}>
                      <Key size={20} color="#6366f1" />
                      <Text style={styles.settingText}>Change Password</Text>
                    </View>
                    <ChevronRight size={20} color="#94a3b8" />
                  </Pressable>
                )}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>App Preferences</Text>
              <View style={styles.settingsList}>
                <View style={styles.settingItem}>
                  <View style={styles.settingLeft}>
                    <Bell size={20} color="#6366f1" />
                    <Text style={styles.settingText}>Notifications</Text>
                  </View>
                  <Switch value={true} />
                </View>

                <View style={styles.settingItem}>
                  <View style={styles.settingLeft}>
                    <Moon size={20} color="#6366f1" />
                    <Text style={styles.settingText}>Dark Mode</Text>
                  </View>
                  <Switch value={false} />
                </View>

                <View style={styles.settingItem}>
                  <View style={styles.settingLeft}>
                    <Volume2 size={20} color="#6366f1" />
                    <Text style={styles.settingText}>Sound Effects</Text>
                  </View>
                  <Switch value={true} />
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Account</Text>
              <View style={styles.settingsList}>
                <Pressable style={styles.settingItem}>
                  <View style={styles.settingLeft}>
                    <Lock size={20} color="#6366f1" />
                    <Text style={styles.settingText}>Privacy</Text>
                  </View>
                  <ChevronRight size={20} color="#94a3b8" />
                </Pressable>

                <Pressable style={styles.settingItem}>
                  <View style={styles.settingLeft}>
                    <Globe size={20} color="#6366f1" />
                    <Text style={styles.settingText}>Language</Text>
                  </View>
                  <View style={styles.settingRight}>
                    <Text style={styles.settingValue}>English</Text>
                    <ChevronRight size={20} color="#94a3b8" />
                  </View>
                </Pressable>

                <Pressable
                  style={[styles.settingItem, styles.logoutButton]}
                  onPress={handleSignOut}>
                  <View style={styles.settingLeft}>
                    <LogOut size={20} color="#ef4444" />
                    <Text style={[styles.settingText, styles.logoutText]}>
                      Log Out
                    </Text>
                  </View>
                </Pressable>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <View style={styles.settingsList}>
                <View style={styles.settingItem}>
                  <Text style={styles.settingText}>Version</Text>
                  <Text style={styles.settingValue}>1.0.0</Text>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#6366f1',
    fontWeight: '500',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  profileInfo: {
    alignItems: 'center',
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  userBio: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
  },
  editIconButton: {
    padding: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
  },
  editForm: {
    width: '100%',
    paddingHorizontal: 20,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  editButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
  },
  cancelButtonText: {
    color: '#64748b',
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#6366f1',
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: '500',
  },
  authContainer: {
    padding: 20,
  },
  formField: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
    fontSize: 14,
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  authButton: {
    backgroundColor: '#6366f1',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  authButtonDisabled: {
    opacity: 0.7,
  },
  authButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  switchModeButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  switchModeText: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '500',
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 20,
    marginTop: 16,
  },
  errorIcon: {
    marginBottom: 8,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
  },
  resendButton: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    alignItems: 'center',
  },
  resendButtonText: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '500',
  },
  successContainer: {
    backgroundColor: '#dcfce7',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 20,
    marginTop: 16,
  },
  successText: {
    color: '#10b981',
    fontSize: 14,
  },
  authPrompt: {
    backgroundColor: '#ffffff',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },
  authPromptTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
  },
  authPromptText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
  },
  authPromptButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  authPromptButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  userSection: {
    backgroundColor: '#ffffff',
    padding: 20,
    marginBottom: 20,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  userEmail: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  userRole: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  userMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  metadataText: {
    fontSize: 14,
    color: '#64748b',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 10,
  },
  settingsList: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingText: {
    fontSize: 16,
    color: '#1e293b',
  },
  settingValue: {
    fontSize: 14,
    color: '#64748b',
  },
  logoutButton: {
    borderBottomWidth: 0,
  },
  logoutText: {
    color: '#ef4444',
  },
  changePasswordForm: {
    padding: 16,
  },
  passwordActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  passwordButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
});