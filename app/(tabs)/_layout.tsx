import { Tabs } from 'expo-router';
import { Chrome as Home, BookOpen, Users, Settings, Shield } from 'lucide-react-native';
import { memo } from 'react';

interface IconProps {
  size?: number;
  color?: string;
}

// Memoize tab icons with default parameters
const HomeIcon = memo(({ size = 24, color = '#64748b' }: IconProps) => (
  <Home size={size} color={color} />
));

const BooksIcon = memo(({ size = 24, color = '#64748b' }: IconProps) => (
  <BookOpen size={size} color={color} />
));

const CommunityIcon = memo(({ size = 24, color = '#64748b' }: IconProps) => (
  <Users size={size} color={color} />
));

const SettingsIcon = memo(({ size = 24, color = '#64748b' }: IconProps) => (
  <Settings size={size} color={color} />
));

const AdminIcon = memo(({ size = 24, color = '#64748b' }: IconProps) => (
  <Shield size={size} color={color} />
));

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#f1f1f1',
        },
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#94a3b8',
        // Disable tab animations for faster switching
        tabBarAnimation: 'none',
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ size, color }) => <HomeIcon size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="books"
        options={{
          title: 'Books',
          tabBarIcon: ({ size, color }) => <BooksIcon size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: 'Community',
          tabBarIcon: ({ size, color }) => <CommunityIcon size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ size, color }) => <SettingsIcon size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="(admin)"
        options={{
          title: 'Admin',
          tabBarIcon: ({ size, color }) => <AdminIcon size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}