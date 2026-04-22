import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../../../src/components/Button';
import { colors, radius, shadow, spacing, typography } from '../../../src/constants/theme';
import { getRoute } from '../../../src/api/routes';
import { skipStop } from '../../../src/api/stops';
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
  const [skipLoading, setSkipLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    loadStop();
  }, [id]);

  async function loadStop() {
    setLoading(true);
    setError(null);
    try {
      // On passe par getRoute → on cherche le stop dans les stops de la route
      // Pour l'instant on navigue depuis la liste où on a déjà les données
      // On recharge la route du jour pour avoir les données fraîches
      const { getRouteDuJour } = await import('../../../src/api/routes');
      const route = await getRouteDuJour();
      if (route) {
        const found = route.stops.find(s => s.id === id);
        if (found) { setStop(found); setLoading(false); return; }
      }
      setError('Stop introuvable');
    } catch (err) {
      setError(extractMessage(err));
    } finally {
      setLoading(false);
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
            setSkipLoading(true);
            try {
              const updated = await skipStop(stop.id);
              setStop(updated);
            } catch (err) {
              Alert.alert('Erreur', extractMessage(err));
            } finally {
              setSkipLoading(false);
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

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>

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

        {/* Geofence */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Géofence</Text>
          <Row label="Rayon" value={`${stop.rayon_geofence_m} m`} />
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
              label="Passer ce stop"
              onPress={handleSkip}
              variant="danger"
              loading={skipLoading}
            />
            <Text style={styles.hint}>
              L'arrivée automatique sera activée en Mobile M2 (GPS).
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  scroll: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  statutBanner: {
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  statutText: {
    fontWeight: '700',
    fontSize: 15,
  },
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
  adresse: {
    ...typography.body,
    fontWeight: '500',
    lineHeight: 22,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLabel: { ...typography.small },
  rowValue: { ...typography.label },
  notes: {
    ...typography.body,
    fontStyle: 'italic',
    color: colors.textSecondary,
  },
  actions: {
    gap: spacing.sm,
  },
  hint: {
    ...typography.xs,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  errorText: { color: colors.danger, fontSize: 14 },
});
