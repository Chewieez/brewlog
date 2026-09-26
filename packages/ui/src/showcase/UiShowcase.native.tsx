import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Button } from '../button/Button.native';
import { Card } from '../card/Card.native';
import { Badge } from '../badge/Badge.native';
import { Input } from '../input/Input.native';
import { MetricTile } from '../metric-tile/MetricTile.native';
import { INDUSTRIAL_PRECISION_THEME } from '@brewlog/core';
import type { UiShowcaseProps } from './UiShowcase.types';

const colors = INDUSTRIAL_PRECISION_THEME.colors;

export const UiShowcase: React.FC<UiShowcaseProps> = ({ testID }) => {
  const [dose, setDose] = useState('18.5');

  return (
    <ScrollView testID={testID} contentContainerStyle={styles.container}>
      <Text style={styles.sectionHeader}>SHOWCASE: BUTTONS</Text>
      <View style={styles.row}>
        <Button label="START BREW" variant="primary" />
        <Button label="SETTINGS" variant="secondary" />
      </View>

      <Text style={styles.sectionHeader}>SHOWCASE: METRIC TILES</Text>
      <View style={styles.tileGrid}>
        <MetricTile label="COFFEE DOSE" value="15.0" unit="g" />
        <MetricTile label="WATER TARGET" value="250" unit="g" />
        <MetricTile label="POUR TO" value="100" unit="g" variant="accent" />
      </View>

      <Text style={styles.sectionHeader}>SHOWCASE: BADGES</Text>
      <View style={styles.badgeRow}>
        <Badge label="V60" variant="mono" />
        <Badge label="AEROPRESS" variant="mono" />
        <Badge label="NATURAL" variant="default" />
        <Badge label="PEAK" variant="success" />
      </View>

      <Text style={styles.sectionHeader}>SHOWCASE: INPUTS</Text>
      <Input label="COFFEE DOSE" variant="numeric" value={dose} onChangeText={setDose} unit="g" />

      <Text style={styles.sectionHeader}>SHOWCASE: CARDS</Text>
      <Card variant="default">
        <Text style={styles.cardText}>Standard Chassis Card</Text>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16, backgroundColor: colors.canvas },
  sectionHeader: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 1.2,
    marginTop: 8,
  },
  row: { flexDirection: 'row', gap: 12 },
  tileGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 12,
    padding: 16,
  },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cardText: { color: colors.textPrimary, fontFamily: 'Outfit_400Regular', fontSize: 14 },
});
