import { Stack } from 'expo-router';

export default function BookLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="chapters" />
      <Stack.Screen name="chapters/[chapterId]" />
    </Stack>
  );
}