import { Stack } from 'expo-router';
import { colors } from '../../src/constants/theme';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen
        name="stop/[id]"
        options={{
          headerShown: true,
          headerTitle: 'Détail du stop',
          headerBackTitle: 'Retour',
          headerTintColor: colors.primary,
          headerStyle: { backgroundColor: colors.surface },
        }}
      />
    </Stack>
  );
}
