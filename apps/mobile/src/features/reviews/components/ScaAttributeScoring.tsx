import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import {
  CuppingAttributes,
  calculateScaScore,
  INDUSTRIAL_PRECISION_THEME,
} from '@brewlog/core';
import { FONTS } from '../../../theme/fonts';

const { colors } = INDUSTRIAL_PRECISION_THEME;

export interface ScaAttributeScoringProps {
  scores: CuppingAttributes;
  onChange: (scores: CuppingAttributes) => void;
  readOnly?: boolean;
}

interface AttributeDef {
  key: keyof CuppingAttributes;
  label: string;
  step: number;
}

const ATTRIBUTES: AttributeDef[] = [
  { key: 'fragranceAroma', label: 'Fragrance / Aroma', step: 0.25 },
  { key: 'flavor', label: 'Flavor', step: 0.25 },
  { key: 'aftertaste', label: 'Aftertaste', step: 0.25 },
  { key: 'acidity', label: 'Acidity', step: 0.25 },
  { key: 'body', label: 'Body', step: 0.25 },
  { key: 'balance', label: 'Balance', step: 0.25 },
  { key: 'uniformity', label: 'Uniformity', step: 0.25 },
  { key: 'cleanCup', label: 'Clean Cup', step: 0.25 },
  { key: 'sweetness', label: 'Sweetness', step: 0.25 },
  { key: 'overall', label: 'Overall', step: 0.25 },
];

export const BASELINE_SCORES: CuppingAttributes = {
  fragranceAroma: 7.5,
  flavor: 7.5,
  aftertaste: 7.5,
  acidity: 7.5,
  body: 7.5,
  balance: 7.5,
  uniformity: 10.0,
  cleanCup: 10.0,
  sweetness: 10.0,
  overall: 7.5,
};

export const CLEAR_SCORES: CuppingAttributes = {
  fragranceAroma: 0,
  flavor: 0,
  aftertaste: 0,
  acidity: 0,
  body: 0,
  balance: 0,
  uniformity: 0,
  cleanCup: 0,
  sweetness: 0,
  overall: 0,
};

function getClassification(score: number): { label: string; color: string } {
  if (score >= 90) return { label: 'Outstanding (Specialty)', color: colors.accent };
  if (score >= 85) return { label: 'Excellent (Specialty)', color: colors.statusSuccess };
  if (score >= 80) return { label: 'Very Good (Specialty)', color: colors.accentHover };
  return { label: 'Below Specialty', color: colors.textMuted };
}

export const ScaAttributeScoring: React.FC<ScaAttributeScoringProps> = ({
  scores,
  onChange,
  readOnly = false,
}) => {
  const totalScore = calculateScaScore(scores);
  const classification = getClassification(totalScore);

  const updateAttribute = (key: keyof CuppingAttributes, delta: number) => {
    if (readOnly) return;
    const current = Number(scores[key] ?? 0);
    const updated = Math.min(10, Math.max(0, Math.round((current + delta) * 100) / 100));
    onChange({
      ...scores,
      [key]: updated,
    });
  };

  return (
    <View style={styles.container}>
      {/* Live Score Hero */}
      <View style={styles.heroChassis}>
        <View>
          <Text style={styles.heroEyebrow}>SCA SENSORY TOTAL</Text>
          <Text style={[styles.heroBadge, { color: classification.color }]}>
            {classification.label}
          </Text>
        </View>
        <Text style={styles.heroScore}>{totalScore.toFixed(1)}</Text>
      </View>

      {/* Presets Row */}
      {!readOnly && (
        <View style={styles.presetRow}>
          <Pressable
            style={styles.presetButton}
            onPress={() => onChange(BASELINE_SCORES)}
            accessibilityRole="button"
            accessibilityLabel="Apply Baseline 82.5 preset"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.presetButtonText}>Baseline (82.5)</Text>
          </Pressable>
          <Pressable
            style={styles.presetButton}
            onPress={() => onChange(CLEAR_SCORES)}
            accessibilityRole="button"
            accessibilityLabel="Clear all scores to zero"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.presetButtonText}>Clear (0)</Text>
          </Pressable>
        </View>
      )}

      {/* Attributes List */}
      <View style={styles.attributesList}>
        {ATTRIBUTES.map((attr) => {
          const value = Number(scores[attr.key] ?? 0);
          return (
            <View key={attr.key} style={styles.attributeRow}>
              <View style={styles.labelCol}>
                <Text style={styles.attributeTitle}>{attr.label}</Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${(value / 10) * 100}%` },
                    ]}
                  />
                </View>
              </View>

              <View style={styles.stepperContainer}>
                {!readOnly && (
                  <Pressable
                    style={styles.stepperButton}
                    onPress={() => updateAttribute(attr.key, -attr.step)}
                    accessibilityRole="button"
                    accessibilityLabel={`Decrease ${attr.label}`}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Minus size={14} color={colors.textPrimary} />
                  </Pressable>
                )}

                <Text style={styles.attributeValue}>{value.toFixed(2)}</Text>

                {!readOnly && (
                  <Pressable
                    style={styles.stepperButton}
                    onPress={() => updateAttribute(attr.key, attr.step)}
                    accessibilityRole="button"
                    accessibilityLabel={`Increase ${attr.label}`}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Plus size={14} color={colors.textPrimary} />
                  </Pressable>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  heroChassis: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 8,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroEyebrow: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 1.2,
  },
  heroBadge: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    marginTop: 2,
  },
  heroScore: {
    fontFamily: FONTS.displayLight,
    fontSize: 32,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetButton: {
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  presetButtonText: {
    fontFamily: FONTS.monoMedium,
    fontSize: 11,
    color: colors.textPrimary,
  },
  attributesList: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 8,
    padding: 12,
    gap: 10,
  },
  attributeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    minHeight: 44,
  },
  labelCol: {
    flex: 1,
    marginRight: 12,
  },
  attributeTitle: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  barTrack: {
    height: 4,
    backgroundColor: colors.panelRecessed,
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: colors.accent,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperButton: {
    width: 32,
    height: 32,
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attributeValue: {
    fontFamily: FONTS.sansBold,
    fontSize: 13,
    color: colors.textPrimary,
    width: 44,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
});
