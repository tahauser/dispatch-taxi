import { ExpoConfig, ConfigContext } from 'expo/config';
import { withDangerousMod } from '@expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';

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
      ['expo-build-properties', { android: { usesCleartextTraffic: true } }],
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

  // Workaround: bug FIR (StackOverflow dans AbstractDiagnosticCollectorVisitor) avec
  // Kotlin 2.0.21 sur le build composite @react-native/gradle-plugin de RN 0.79.
  // Correctif : passer à Kotlin 2.1.20 (bug corrigé) + forcer in-process pour éviter
  // les limites heap/stack des workers Gradle.
  // withDangerousMod s'exécute pendant expo prebuild (après le cache restore npm),
  // contrairement à postinstall qui est sauté si EAS restaure node_modules depuis son cache.
  return withDangerousMod(appConfig, [
    'android',
    (modConfig) => {
      const pluginDir = path.join(
        modConfig.modRequest.projectRoot,
        'node_modules',
        '@react-native',
        'gradle-plugin',
      );

      if (!fs.existsSync(pluginDir)) {
        return modConfig;
      }

      // 1. Patcher libs.versions.toml : Kotlin 2.0.21 → 2.1.20
      const tomlPath = path.join(pluginDir, 'gradle', 'libs.versions.toml');
      if (fs.existsSync(tomlPath)) {
        const toml = fs.readFileSync(tomlPath, 'utf8');
        const patched = toml.replace(/^kotlin\s*=\s*"[^"]+"/m, 'kotlin = "2.1.20"');
        fs.writeFileSync(tomlPath, patched, 'utf8');
      }

      // 2. Créer gradle.properties pour forcer la compilation in-process avec plus de stack
      const propsPath = path.join(pluginDir, 'gradle.properties');
      fs.writeFileSync(
        propsPath,
        [
          'kotlin.compiler.execution.strategy=in-process',
          'kotlin.incremental=false',
          'org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m -Xss8m',
          '',
        ].join('\n'),
        'utf8',
      );

      return modConfig;
    },
  ]);
};
