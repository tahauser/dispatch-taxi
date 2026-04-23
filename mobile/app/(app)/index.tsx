import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Button from '../../src/components/Button';
import RouteHeader from '../../src/components/RouteHeader';
import Screen from '../../src/components/Screen';
import StopCard from '../../src/components/StopCard';
import { colors, spacing, typography } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { useRouteDuJour } from '../../src/hooks/useRouteDuJour';
import { useGpsTracking } from '../../src/hooks/useGpsTracking';
import { Stop } from '../../src/types/api';
import { completeRoute, startRoute } from '../../src/api/routes';
import { extractMessage } from '../../src/utils/errors';
import { formatDate } from '../../src/utils/date';

export default function RouteDuJourScreen() {
  const { chauffeur, logout } = useAuth();
  const { route, loading, refreshing, error, refresh } = useRouteDuJour();
  const router = useRouter();
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { nearbyStop, hasPermission } = useGpsTracking({
    routeId: route?.id ?? null,
    stops: route?.stops ?? [],
    enabled: route?.statut === 'en_cours',
  });

  async function handleStart() {
    if (!route) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await startRoute(route.id);
      await refresh();
    } catch (err) {
      setActionError(extractMessage(err));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleComplete() {
    if (!route) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await completeRoute(route.id);
      await refresh();
    } catch (err) {
      setActionError(extractMessage(err));
    } finally {
      setActionLoading(false);
    }
  }

  function handleStopPress(stop: Stop) {
    router.push(`/(app)/stop/${stop.id}`);
  }

  const isTracking = route?.statut === 'en_cours';

  return (
    <Screen edges={['top', 'bottom']}>
      {chauffeur && <RouteHeader chauffeur={chauffeur} onLogout={logout} />}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <Button label="Réessayer" onPress={refresh} variant="secondary" style={{ marginTop: spacing.md }} />
        </View>
      ) : route === null ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>🚖</Text>
          <Text style={styles.emptyTitle}>Aucune tourn{'é'}e aujourd&apos;hui</Text>
          <Text style={styles.emptySubtitle}>Votre dispatch vous assignera une route le matin.</Text>
          <Button label="Actualiser" onPress={refresh} variant="ghost" style={{ marginTop: spacing.lg }} />
        </View>
      ) : (
        <FlatList
          data={route.stops}
          keyExtractor={item => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
          }
          ListHeaderComponent={
            <View style={styles.header}>
              <Text style={styles.routeName}>{route.nom}</Text>
              <Text style={styles.routeDate}>{formatDate(route.date_planifiee)}</Text>

              <View style={styles.progress}>
                <Text style={styles.progressText}>
                  {route.stops.filter(s => s.statut === 'arrive').length} / {route.stops.length} stops complétés
                </Text>
              </View>

              {actionError ? (
                <Text style={styles.errorText}>{actionError}</Text>
              ) : null}

              {route.statut === 'planifiee' && (
                <Button
                  label="Démarrer la tournée"
                  onPress={handleStart}
                  loading={actionLoading}
                  style={styles.actionBtn}
                />
              )}
              {route.statut === 'en_cours' && (
                <Button
                  label="Terminer la tournée"
                  onPress={handleComplete}
                  loading={actionLoading}
                  variant="secondary"
                  style={styles.actionBtn}
                />
              )}
              {route.statut === 'terminee' && (
                <View style={styles.doneBanner}>
                  <Text style={styles.doneText}>✅ Tournée terminée</Text>
                </View>
              )}

              {/* Indicateur GPS — visible quand la tournée est en cours */}
              {isTracking && (
                <View style={[
                  styles.gpsBadge,
                  { backgroundColor: hasPermission ? colors.successLight : colors.warningLight },
                ]}>
                  <Text style={[
                    styles.gpsText,
                    { color: hasPermission ? colors.success : colors.warning },
                  ]}>
                    {hasPermission
                      ? nearbyStop
                        ? `GPS · Prochain stop détecté`
                        : 'GPS actif'
                      : 'GPS · Permission requise'}
                  </Text>
                </View>
              )}

              <Text style={styles.sectionTitle}>Arrêts</Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <StopCard stop={item} index={index} onPress={handleStopPress} />
          )}
          contentContainerStyle={styles.list}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { ...typography.h2, textAlign: 'center' },
  emptySubtitle: { ...typography.small, textAlign: 'center' },
  header: {
    padding: spacing.md,
    paddingTop: spacing.lg,
    gap: spacing.sm,
  },
  routeName: {
    ...typography.h2,
  },
  routeDate: {
    ...typography.small,
    textTransform: 'capitalize',
  },
  progress: {
    backgroundColor: colors.primaryLight,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  progressText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  actionBtn: {
    marginTop: spacing.xs,
  },
  doneBanner: {
    backgroundColor: colors.successLight,
    borderRadius: 8,
    padding: spacing.md,
    alignItems: 'center',
  },
  doneText: {
    color: colors.success,
    fontWeight: '600',
    fontSize: 15,
  },
  gpsBadge: {
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
  },
  gpsText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionTitle: {
    ...typography.h3,
    marginTop: spacing.sm,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    textAlign: 'center',
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
});
