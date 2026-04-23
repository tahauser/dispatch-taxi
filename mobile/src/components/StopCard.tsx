import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadow, spacing, typography } from '../constants/theme';
import { Stop, StatutStop } from '../types/api';
import { formatTime } from '../utils/date';

const STATUT_LABEL: Record<StatutStop, string> = {
  en_attente: 'En attente',
  en_approche: 'En approche',
  arrive: 'Arrivé',
  skip: 'Passé',
};

interface StopCardProps {
  stop: Stop;
  index: number;
  onPress?: (stop: Stop) => void;
}

export default function StopCard({ stop, index, onPress }: StopCardProps) {
  const badgeColor = colors.statutStop[stop.statut];
  const isDone = stop.statut === 'arrive' || stop.statut === 'skip';

  return (
    <Pressable
      onPress={() => onPress?.(stop)}
      style={({ pressed }) => [
        styles.card,
        isDone && styles.cardDone,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.badge, { backgroundColor: badgeColor }]}>
        <Text style={styles.badgeText}>{index + 1}</Text>
      </View>

      <View style={styles.content}>
        <Text style={[styles.adresse, isDone && styles.adresseDone]} numberOfLines={2}>
          {stop.adresse}
        </Text>

        <View style={styles.meta}>
          <View style={[styles.statutPill, { backgroundColor: badgeColor + '22' }]}>
            <Text style={[styles.statutText, { color: badgeColor }]}>
              {STATUT_LABEL[stop.statut]}
            </Text>
          </View>

          {stop.heure_arrivee_prevue && (
            <Text style={styles.heure}>
              Prévu {formatTime(stop.heure_arrivee_prevue)}
            </Text>
          )}
          {stop.heure_arrivee_reelle && (
            <Text style={[styles.heure, { color: colors.success }]}>
              Arrivé {formatTime(stop.heure_arrivee_reelle)}
            </Text>
          )}
        </View>

        {stop.notes ? (
          <Text style={styles.notes} numberOfLines={1}>
            📝 {stop.notes}
          </Text>
        ) : null}
      </View>

      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  cardDone: {
    opacity: 0.65,
  },
  pressed: {
    opacity: 0.75,
  },
  badge: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  badgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  adresse: {
    ...typography.label,
    lineHeight: 20,
  },
  adresseDone: {
    color: colors.textSecondary,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  statutPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  statutText: {
    fontSize: 12,
    fontWeight: '600',
  },
  heure: {
    ...typography.xs,
  },
  notes: {
    ...typography.xs,
    fontStyle: 'italic',
  },
  chevron: {
    fontSize: 22,
    color: colors.textDisabled,
    marginLeft: spacing.sm,
  },
});
