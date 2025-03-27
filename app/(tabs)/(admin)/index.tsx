import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Users, Flag, TriangleAlert as AlertTriangle, ChartBar as BarChart3, Settings2, BookOpen } from 'lucide-react-native';
import { router } from 'expo-router';

export default function AdminScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Dashboard</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Users size={24} color="#6366f1" />
          <Text style={styles.statNumber}>1,234</Text>
          <Text style={styles.statLabel}>Total Users</Text>
        </View>
        <View style={styles.statCard}>
          <Flag size={24} color="#6366f1" />
          <Text style={styles.statNumber}>56</Text>
          <Text style={styles.statLabel}>Reports</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          <Pressable 
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/(admin)/users')}>
            <Users size={24} color="#6366f1" />
            <Text style={styles.actionTitle}>User Management</Text>
          </Pressable>
          <Pressable 
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/(admin)/books')}>
            <BookOpen size={24} color="#6366f1" />
            <Text style={styles.actionTitle}>Book Management</Text>
          </Pressable>
          <Pressable style={styles.actionCard}>
            <Flag size={24} color="#6366f1" />
            <Text style={styles.actionTitle}>Reports</Text>
          </Pressable>
          <Pressable style={styles.actionCard}>
            <Settings2 size={24} color="#6366f1" />
            <Text style={styles.actionTitle}>Settings</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.activityList}>
          <View style={styles.activityItem}>
            <View style={[styles.activityDot, { backgroundColor: '#10b981' }]} />
            <Text style={styles.activityText}>
              <Text style={styles.bold}>New user registration:</Text> John Smith
            </Text>
            <Text style={styles.activityTime}>2m ago</Text>
          </View>
          <View style={styles.activityItem}>
            <View style={[styles.activityDot, { backgroundColor: '#f59e0b' }]} />
            <Text style={styles.activityText}>
              <Text style={styles.bold}>Content reported:</Text> Inappropriate content
            </Text>
            <Text style={styles.activityTime}>15m ago</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>System Status</Text>
        <View style={styles.statusCard}>
          <View style={styles.statusItem}>
            <BarChart3 size={20} color="#10b981" />
            <Text style={styles.statusText}>System Performance: Good</Text>
          </View>
          <View style={styles.statusItem}>
            <AlertTriangle size={20} color="#f59e0b" />
            <Text style={styles.statusText}>2 Pending Reports</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 15,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
    marginTop: 8,
    textAlign: 'center',
  },
  activityList: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  activityText: {
    flex: 1,
    fontSize: 14,
    color: '#64748b',
  },
  activityTime: {
    fontSize: 12,
    color: '#94a3b8',
  },
  bold: {
    fontWeight: '600',
    color: '#1e293b',
  },
  statusCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  statusText: {
    fontSize: 14,
    color: '#1e293b',
  },
});