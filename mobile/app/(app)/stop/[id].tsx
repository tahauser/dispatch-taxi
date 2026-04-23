import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import Button from '../../../src/components/Button';
import { colors, radius, shadow, spacing, typography } from '../../../src/constants/theme';
import { arriveStop, skipStop } from '../../../src/api/stops';
import { haversineM } from '../../../src/hooks/useGpsTracking';
import { Stop, StatutStop } from '../../../src/types/api';
import { extractMessage } from '../../../src/utils/errors';
import { formatDateTime, formatTime } from '../../../src/utils/date';

const STATUT_LABEL: Record<StatutStop, string> = {
  en_attente: 'En attente',
  en_approche: 'En approche',
  arrive: 'Arrivé ✅',
  skip: 'Passé ⏭',
};

export default function StopDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [stop, setStop] = useState<Stop | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [distanceM, setDistanceM] = useState<number | null>(null);

  const loadStop = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { getRouteDuJour } = await import('../../../src/api/routes');
      const route = await getRouteDuJour();
      if (route) {
        const found = route.stops.find(s => s.id === id);
        if (found) {
          setStop(found);
          // Get current position for distance display (best-effort, no throw)
          try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
              const loc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
              });
              setDistanceM(
                haversineM(
                  loc.coords.latitude, loc.coords.longitude,
                  found.latitude, found.longitude,
                ),
              );
            }
          } catch {
            // GPS optionnel — on ignore silencieusement
          }
          return;
        }
      }
      setError('Stop introuvable');
    } catch (err) {
      setError(extractMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    loadStop();
  }, [id, loadStop]);

  async function handleArrive() {
    if (!stop) return;
    setActionLoading(true);
    try {
      let lat = stop.latitude;
      let lon = stop.longitude;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          lat = loc.coords.latitude;
          lon = loc.coords.longitude;
        }
      } catch {
        // Utilise les coords du stop si GPS indisponible
      }
      const updated = await arriveStop(stop.id, {
        latitude: lat,
        longitude: lon,
        timestamp_device: new Date().toISOString(),
      });
      setStop(updated);
      setDistanceM(null);
    } catch (err) {
      Alert.alert('Erreur', extractMessage(err));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSkip() {
    if (!stop) return;
    if (stop.statut === 'arrive' || stop.statut === 'skip') return;
    Alert.alert(
      'Passer ce stop ?',
      `Confirmer le passage du stop : ${stop.adresse}`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              const updated = await skipStop(stop.id);
              setStop(updated);
            } catch (err) {
              Alert.alert('Erreur', extractMessage(err));
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={['bottom']}>
        <ActivityIndicator color={colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  if (error || !stop) {
    return (
      <SafeAreaView style={styles.center} edges={['bottom']}>
        <Text style={styles.errorText}>{error ?? 'Stop introuvable'}</Text>
        <Button label="Retour" onPress={() => router.back()} variant="ghost" style={{ marginTop: spacing.md }} />
      </SafeAreaView>
    );
  }

  const isDone = stop.statut === 'arrive' || stop.statut === 'skip';
  const statutColor = colors.statutStop[stop.statut];
  const withinGeofence = distanceM != null && distanceM <= stop.rayon_geofence_m;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Geofence banner — affiché si le chauffeur est dans la zone */}
        {withinGeofence && !isDone && (
          <View style={styles.geofenceBanner}>
            <Text style={styles.geofenceText}>
              Dans la zone · {Math.round(distanceM!)} m
            </Text>
          </View>
        )}

        {/* Statut pill */}
        <View style={[styles.statutBanner, { backgroundColor: statutColor + '22' }]}>
          <Text style={[styles.statutText, { color: statutColor }]}>
            {STATUT_LABEL[stop.statut]}
          </Text>
        </View>

        {/* Adresse */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Adresse</Text>
          <Text style={styles.adresse}>{stop.adresse}</Text>
        </View>

        {/* Horaires */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Horaires</Text>
          <Row label="Prévu" value={formatTime(stop.heure_arrivee_prevue)} />
          <Row label="Arrivée réelle" value={formatDateTime(stop.heure_arrivee_reelle)} />
        </View>

        {/* Géofence */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Géofence</Text>
          <Row label="Rayon" value={`${stop.rayon_geofence_m} m`} />
          {distanceM != null && (
            <Row
              label="Distance actuelle"
              value={`${Math.round(distanceM)} m`}
              valueColor={withinGeofence ? colors.success : colors.textSecondary}
            />
          )}
          <Row label="Stop n°" value={String(stop.ordre)} />
        </View>

        {/* Notes */}
        {stop.notes ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Notes</Text>
            <Text style={styles.notes}>{stop.notes}</Text>
          </View>
        ) : null}

        {/* Actions */}
        {!isDone && (
          <View style={styles.actions}>
            <Button
              label={withinGeofence ? 'Confirmer l\'arrivée' : 'Marquer comme arrivé'}
              onPress={handleArrive}
              loading={actionLoading}
            />
            <Button
              label="Passer ce stop"
              onPress={handleSkip}
              variant="danger"
              loading={actionLoading}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, valueColor ? { color: valueColor } : null]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.background,
  },
  scroll: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  geofenceBanner: {
    backgroundColor: colors.successLight,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.success + '44',
  },
  geofenceText: {
    color: colors.success,
    fontWeight: '700',
    fontSize: 15,
  },
  statutBanner: {
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  statutText: { fontWeight: '700', fontSize: 15 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadow.card,
  },
  cardLabel: {
    ...typography.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  adresse: { ...typography.body, fontWeight: '500', lineHeight: 22 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { ...typography.small },
  rowValue: { ...typography.label },
  notes: { ...typography.body, fontStyle: 'italic', color: colors.textSecondary },
  actions: { gap: spacing.sm },
  errorText: { color: colors.danger, fontSize: 14 },
});
