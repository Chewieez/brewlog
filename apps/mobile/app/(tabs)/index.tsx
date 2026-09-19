import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import Constants from 'expo-constants';
import {
  INDUSTRIAL_PRECISION_THEME,
  calculateWaterAmount,
} from '@brewlog/core';

export default function TimerScreen() {
  const [dose, setDose] = useState('18');
  const [ratio, setRatio] = useState('16');

  const doseNum = parseFloat(dose) || 0;
  const ratioNum = parseFloat(ratio) || 0;
  const targetWater = calculateWaterAmount(doseNum, ratioNum);

  const { colors } = INDUSTRIAL_PRECISION_THEME;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 1. Status Card: Environment & Profile */}
      <View style={styles.card}>
        <Text style={styles.cardEyebrow}>TIMER & BREW ASSISTANT</Text>
        <Text style={styles.cardTitle}>Mobile Station Ready</Text>
        <Text style={styles.cardBody}>
          Expo SDK {Constants.expoConfig?.version ?? '57'} on {Platform.OS}.
          Connected to @brewlog/core domain engine.
        </Text>
      </View>

      {/* 2. Interactive Calculator Card: Domain Math */}
      <View style={styles.card}>
        <Text style={styles.cardEyebrow}>WATER RATIO CALCULATOR</Text>
        <Text style={styles.cardTitle}>Dose to Yield</Text>

        <View style={styles.inputRow}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>DOSE (G)</Text>
            <TextInput
              style={styles.input}
              value={dose}
              onChangeText={setDose}
              keyboardType="numeric"
              placeholderTextColor={colors.textMuted}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>RATIO (1:X)</Text>
            <TextInput
              style={styles.input}
              value={ratio}
              onChangeText={setRatio}
              keyboardType="numeric"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>

        <View style={styles.resultBox}>
          <Text style={styles.resultLabel}>TARGET WATER</Text>
          <Text style={styles.resultValue}>{targetWater.toFixed(1)}g</Text>
        </View>
      </View>

      {/* 3. Quick Action: Start Brew */}
      <Pressable
        style={({ pressed }) => [
          styles.actionButton,
          pressed && styles.actionButtonPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Start Brew Session"
      >
        <Text style={styles.actionButtonText}>Start Brew Session</Text>
      </Pressable>
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
    gap: 16,
  },
  card: {
    backgroundColor: colors.panel,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 16,
  },
  cardEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  cardBody: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  input: {
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 6,
    color: colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
  },
  resultBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.panelRecessed,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  resultValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.accent,
  },
  actionButton: {
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonPressed: {
    opacity: 0.85,
  },
  actionButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
