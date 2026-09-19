import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import Constants from 'expo-constants';
import {
  INDUSTRIAL_PRECISION_THEME,
  calculateWaterAmount,
  DEFAULT_PRESET_RECIPES,
} from '@brewlog/core';

export default function SmokeScreen() {
  const [dose, setDose] = useState('18');
  const [ratio, setRatio] = useState('16');

  const doseNum = parseFloat(dose) || 0;
  const ratioNum = parseFloat(ratio) || 0;
  const targetWater = calculateWaterAmount(doseNum, ratioNum);

  const { colors } = INDUSTRIAL_PRECISION_THEME;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 1. Header Card: Environment Verification */}
      <View style={styles.card}>
        <Text style={styles.cardEyebrow}>ENVIRONMENT CHECK</Text>
        <Text style={styles.cardTitle}>Mobile Foundation Ready</Text>
        <Text style={styles.cardBody}>
          Expo SDK {Constants.expoConfig?.version ?? '57'} running on {Platform.OS}.
          Workspace link active with @brewlog/core.
        </Text>
      </View>

      {/* 2. Interactive Calculator Card: Domain Math Verification */}
      <View style={styles.card}>
        <Text style={styles.cardEyebrow}>DOMAIN LOGIC PROOF</Text>
        <Text style={styles.cardTitle}>Water Ratio Calculator</Text>

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

      {/* 3. Preset Recipes List: Data Models Verification */}
      <View style={styles.card}>
        <Text style={styles.cardEyebrow}>SHARED DATA MODELS</Text>
        <Text style={styles.cardTitle}>Core Recipe Presets</Text>
        {DEFAULT_PRESET_RECIPES.map((recipe) => (
          <View key={recipe.id} style={styles.recipeRow}>
            <View>
              <Text style={styles.recipeName}>{recipe.name}</Text>
              <Text style={styles.recipeMethod}>
                {recipe.brewMethod.toUpperCase()} • 1:{recipe.ratio}
              </Text>
            </View>
            <Text style={styles.recipeDose}>{recipe.coffeeDoseGrams}g</Text>
          </View>
        ))}
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
  recipeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  recipeName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  recipeMethod: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  recipeDose: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
});
