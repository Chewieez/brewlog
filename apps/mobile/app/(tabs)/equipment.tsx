import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Wrench } from 'lucide-react-native';
import { INDUSTRIAL_PRECISION_THEME } from '@brewlog/core';

export default function EquipmentScreen() {
  const { colors } = INDUSTRIAL_PRECISION_THEME;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.placeholderCard}>
        <View style={styles.iconWrapper}>
          <Wrench size={36} color={colors.accent} />
        </View>
        <Text style={styles.eyebrow}>HARDWARE LOCKER</Text>
        <Text style={styles.title}>Brewers & Grinders</Text>
        <Text style={styles.description}>
          Manage your grinder calibration clicks, burr sets, pourover drippers, espresso pressure profiles, and water recipes.
        </Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>PHASE 3B • CLOUD SYNC COMING</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const { colors } = INDUSTRIAL_PRECISION_THEME;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  content: {
    padding: 16,
    flexGrow: 1,
    justifyContent: 'center',
  },
  placeholderCard: {
    backgroundColor: colors.panel,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  badge: {
    marginTop: 8,
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
});
