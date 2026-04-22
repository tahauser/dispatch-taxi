import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../constants/theme';
import { ChauffeurProfil } from '../types/api';

interface RouteHeaderProps {
  chauffeur: ChauffeurProfil;
  onLogout: () => void;
}

export default function RouteHeader({ chauffeur, onLogout }: RouteHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.info}>
        <Text style={styles.name}>
          {chauffeur.prenom} {chauffeur.nom}
        </Text>
        <Text style={styles.numero}>{chauffeur.numero_chauffeur}</Text>
      </View>
      <Pressable onPress={onLogout} style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}>
        <Text style={styles.btnText}>Déconnexion</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
  },
  info: {
    flex: 1,
  },
  name: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  numero: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
  },
  btn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  btnPressed: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  btnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
});
