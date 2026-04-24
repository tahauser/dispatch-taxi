import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Dispatch Taxi',
  slug: 'dispatch-taxi-mobile',
  version: '1.0.0',
  scheme: 'dispatchtaxi',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  runtimeVersion: {
    policy: 'appVersion',
  },
  updates: {
    url: `https://u.expo.dev/${process.env.EXPO_PROJECT_ID ?? ''}`,
  },
  icon: './assets/icon.png',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#1A56DB',
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.tahauser.dispatchtaxi',
    infoPlist: {
      NSAppTransportSecurity: {
        // FIXME: Retirer quand le backend passera en HTTPS
        NSAllowsArbitraryLoads: false,
        NSExceptionDomains: {
          '40.85.221.73': {
            NSExceptionAllowsInsecureHTTPLoads: true,
            NSIncludesSubdomains: false,
          },
        },
      },
    },
  },
  android: {
    package: 'com.tahauser.dispatchtaxi',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#1A56DB',
    },
    // FIXME: Retirer quand le backend passera en HTTPS
    // usesCleartextTraffic: true dans AndroidManifest est géré par le plugin expo-build-properties
    // Ajouter: npx expo install expo-build-properties + config plugin si HTTP en production
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Dispatch Taxi utilise votre position pour détecter les arrêts et enregistrer votre trajet.',
      },
    ],
    // FIXME: Retirer usesCleartextTraffic quand le backend passera en HTTPS
    ['expo-build-properties', { android: { usesCleartextTraffic: true, kotlinVersion: '2.0.21' } }],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: process.env.EXPO_PROJECT_ID,
    },
    apiBaseUrl: process.env.API_BASE_URL ?? 'http://40.85.221.73:3001/api',
  },
});
