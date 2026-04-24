import { ExpoConfig, ConfigContext } from 'expo/config';
import { withGradleProperties } from '@expo/config-plugins';

export default ({ config }: ConfigContext): ExpoConfig => {
  const appConfig: ExpoConfig = {
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
  };

  // Workaround: Kotlin "Internal compiler error" dans GradleCompilerRunnerWithWorkers.
  // Les workers Kotlin manquent de heap quand ils compilent le gradle-plugin de RN 0.79.
  // On force l'exécution in-process et on augmente le heap JVM.
  return withGradleProperties(appConfig, (props) => {
    const overrides: Array<{ key: string; value: string }> = [
      { key: 'org.gradle.jvmargs', value: '-Xmx4096m -XX:MaxMetaspaceSize=1024m' },
      { key: 'kotlin.compiler.execution.strategy', value: 'in-process' },
    ];
    for (const entry of overrides) {
      props.modResults = props.modResults.filter(
        (item) => !(item.type === 'property' && item.key === entry.key)
      );
      props.modResults.push({ type: 'property', key: entry.key, value: entry.value });
    }
    return props;
  });
};
