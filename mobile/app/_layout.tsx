import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../src/context/AuthContext';

function RootLayoutNav() {
  const { chauffeur, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inApp = segments[0] === '(app)';
    if (!chauffeur && inApp) {
      router.replace('/login');
    } else if (chauffeur && !inApp) {
      router.replace('/(app)');
    }
  }, [chauffeur, loading, segments]);

  // Ne rien rendre tant que l'hydratation n'est pas terminée
  if (loading) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="(app)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="auto" />
        <RootLayoutNav />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
