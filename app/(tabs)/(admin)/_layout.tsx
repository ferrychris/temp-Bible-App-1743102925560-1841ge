import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="books" options={{ headerShown: false }} />
      <Stack.Screen name="chapters" options={{ headerShown: false }} />
      <Stack.Screen name="book" options={{ headerShown: false }} />
    </Stack>
  );
}