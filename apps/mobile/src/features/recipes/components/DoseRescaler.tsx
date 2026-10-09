import React from 'react';
import { View, Text, Pressable, TextInput, StyleSheet } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { INDUSTRIAL_PRECISION_THEME } from '@brewlog/core';
import { FONTS } from '../../../theme/fonts';

const { colors } = INDUSTRIAL_PRECISION_THEME;

export interface DoseRescalerProps {
  currentDose: number;
  baseDose: number;
  onDoseChange: (dose: number) => void;
}

const PRESETS = [
  { name: 'Single', dose: 15 },
  { name: 'Standard', dose: 18 },
  { name: 'Server', dose: 30 },
  { name: 'Batch', dose: 45 },
];

export const DoseRescaler: React.FC<DoseRescalerProps> = ({
  currentDose,
  baseDose,
  onDoseChange,
}) => {
  const handleStep = (delta: number) => {
    const next = Math.max(1, Math.min(100, Math.round((currentDose + delta) * 10) / 10));
    onDoseChange(next);
  };

  const handleTextCommit = (val: string) => {
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 100) {
      onDoseChange(Math.round(parsed * 10) / 10);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>COFFEE DOSE RESCALER</Text>
        {currentDose !== baseDose ? (
          <Pressable
            onPress={() => onDoseChange(baseDose)}
            style={styles.resetButton}
            accessibilityRole="button"
          >
            <Text style={styles.resetText}>Reset ({baseDose}g)</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.controlsRow}>
        <Pressable
          onPress={() => handleStep(-1)}
          style={styles.stepperButton}
          accessibilityRole="button"
          accessibilityLabel="Decrease dose by 1 gram"
        >
          <Minus size={18} color={colors.textPrimary} />
        </Pressable>

        <View style={styles.doseInputWrapper}>
          <TextInput
            defaultValue={String(currentDose)}
            key={String(currentDose)}
            onEndEditing={(e) => handleTextCommit(e.nativeEvent.text)}
            keyboardType="decimal-pad"
            style={styles.doseInput}
            accessibilityLabel="Target coffee dose in grams"
          />
          <Text style={styles.doseUnit}>g</Text>
        </View>

        <Pressable
          onPress={() => handleStep(1)}
          style={styles.stepperButton}
          accessibilityRole="button"
          accessibilityLabel="Increase dose by 1 gram"
        >
          <Plus size={18} color={colors.textPrimary} />
        </Pressable>
      </View>

      <View style={styles.presetsRow}>
        {PRESETS.map((p) => {
          const isActive = currentDose === p.dose;
          return (
            <Pressable
              key={p.dose}
              onPress={() => onDoseChange(p.dose)}
              style={[
                styles.presetPill,
                isActive ? styles.presetPillActive : styles.presetPillInactive,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${p.name} (${p.dose}g)`}
            >
              <Text
                style={[
                  styles.presetName,
                  isActive ? styles.presetTextActive : styles.presetTextInactive,
                ]}
                numberOfLines={1}
              >
                {p.name}
              </Text>
              <Text
                style={[
                  styles.presetDose,
                  isActive ? styles.presetDoseActive : styles.presetDoseInactive,
                ]}
              >
                {p.dose}g
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 8,
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  resetButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  resetText: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    color: colors.accent,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  stepperButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doseInputWrapper: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 8,
    paddingHorizontal: 16,
    minHeight: 44,
    justifyContent: 'center',
  },
  doseInput: {
    fontFamily: FONTS.sansBold,
    fontSize: 22,
    color: colors.textPrimary,
    minWidth: 44,
    textAlign: 'center',
    paddingVertical: 4,
    fontVariant: ['tabular-nums'],
  },
  doseUnit: {
    fontFamily: FONTS.sansRegular,
    fontSize: 14,
    color: colors.textMuted,
    marginLeft: 4,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetPill: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  presetPillActive: {
    backgroundColor: colors.panelRecessed,
    borderColor: colors.accent,
  },
  presetPillInactive: {
    backgroundColor: colors.panelRecessed,
    borderColor: colors.borderSubtle,
  },
  presetName: {
    fontFamily: FONTS.sansMedium,
    fontSize: 11,
    letterSpacing: 0.2,
  },
  presetDose: {
    fontFamily: FONTS.monoBold,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  presetTextActive: {
    color: colors.accent,
    fontFamily: FONTS.sansBold,
  },
  presetTextInactive: {
    color: colors.textSecondary,
  },
  presetDoseActive: {
    color: colors.accent,
  },
  presetDoseInactive: {
    color: colors.textMuted,
  },
});
