import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Plus, Users as Users2, Mail, Shield, Search } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

export default function UsersScreen() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .rpc('get_users');

      if (fetchError) throw fetchError;
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = () => {
    router.push('/(tabs)/(admin)/users/bulk');
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>User Management</Text>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <ScrollView style={styles.content}>
        {users.length === 0 ? (
          <View style={styles.emptyState}>
            <Users2 size={48} color="#6366f1" />
            <Text style={styles.emptyStateText}>No users found</Text>
            <Text style={styles.emptyStateSubtext}>
              Start by adding your first user
            </Text>
          </View>
        ) : (
          <View style={styles.usersList}>
            {users.map((user) => (
              <View key={user.id} style={styles.userCard}>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>
                    {user.user_metadata?.name || user.email}
                  </Text>
                  <Text style={styles.userEmail}>{user.email}</Text>
                </View>

                <View style={styles.userMeta}>
                  <View style={styles.roles}>
                    {user.roles?.map((role: string) => (
                      <View 
                        key={role} 
                        style={[
                          styles.roleBadge,
                          role === 'admin' && styles.adminBadge
                        ]}>
                        <Text style={[
                          styles.roleText,
                          role === 'admin' && styles.adminText
                        ]}>
                          {role}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <View style={[
                    styles.statusBadge,
                    user.is_active ? styles.activeBadge : styles.inactiveBadge
                  ]}>
                    <Text style={[
                      styles.statusText,
                      user.is_active ? styles.activeText : styles.inactiveText
                    ]}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Pressable 
        style={styles.addButton}
        onPress={handleAddUser}>
        <Plus size={24} color="#ffffff" />
      </Pressable>
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
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    padding: 12,
    margin: 20,
    borderRadius: 8,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  usersList: {
    gap: 12,
  },
  userCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },
  userInfo: {
    marginBottom: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#64748b',
  },
  userMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roles: {
    flexDirection: 'row',
    gap: 8,
  },
  roleBadge: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  adminBadge: {
    backgroundColor: '#818cf8',
  },
  roleText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
  },
  adminText: {
    color: '#ffffff',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: '#dcfce7',
  },
  inactiveBadge: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  activeText: {
    color: '#10b981',
  },
  inactiveText: {
    color: '#ef4444',
  },
  addButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
  },
});