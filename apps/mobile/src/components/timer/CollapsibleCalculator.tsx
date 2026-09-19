import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { ChevronDown, ChevronUp, Calculator } from 'lucide-react-native';
import { INDUSTRIAL_PRECISION_THEME, calculateWaterAmount } from '@brewlog/core';
import { FONTS } from '../../theme/fonts';

const { colors } = INDUSTRIAL_PRECISION_THEME;

export interface CollapsibleCalculatorProps {
  initialDose?: number;
  initialRatio?: number;
  defaultDose?: number;
  defaultRatio?: number;
}

export const CollapsibleCalculator: React.FC<CollapsibleCalculatorProps> = ({
  initialDose = 18,
  initialRatio = 16,
  defaultDose,
  defaultRatio,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [dose, setDose] = useState((defaultDose ?? initialDose).toString());
  const [ratio, setRatio] = useState((defaultRatio ?? initialRatio).toString());

  const doseNum = parseFloat(dose) || 0;
  const ratioNum = parseFloat(ratio) || 0;
  const targetWater = calculateWaterAmount(doseNum, ratioNum);

  return (
    <View style={styles.card}>
      <Pressable
        onPress={() => setIsExpanded((prev) => !prev)}
        style={styles.header}
        accessibilityRole="button"
        accessibilityLabel="Toggle Ratio Calculator"
        accessibilityState={{ expanded: isExpanded }}
      >
        <View style={styles.headerLeft}>
          <Calculator size={15} color={colors.accent} />
          <Text style={styles.title}>RATIO CALCULATOR</Text>
          <Text style={styles.summaryBadge}>
            {doseNum}g @ 1:{ratioNum} ➔ {targetWater.toFixed(1)}g
          </Text>
        </View>
        {isExpanded ? (
          <ChevronUp size={16} color={colors.textMuted} />
        ) : (
          <ChevronDown size={16} color={colors.textMuted} />
        )}
      </Pressable>

      {isExpanded && (
        <View style={styles.body}>
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

          <View style={styles.targetRow}>
            <Text style={styles.targetLabel}>TARGET WATER</Text>
            <Text style={styles.targetValue}>{targetWater.toFixed(1)}g</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.panel,
    borderColor: colors.borderSubtle,
    borderWidth: 1,
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 6,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: colors.textMuted,
    fontSize: 10,
    fontFamily: FONTS.monoBold,
    letterSpacing: 1.2,
  },
  summaryBadge: {
    color: colors.textPrimary,
    fontSize: 11,
    fontFamily: FONTS.monoRegular,
    fontWeight: '500',
  },
  body: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    gap: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  inputGroup: {
    flex: 1,
    gap: 4,
  },
  inputLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontFamily: FONTS.monoBold,
    letterSpacing: 1,
  },
  input: {
    backgroundColor: colors.panelRecessed,
    borderColor: colors.borderSubtle,
    borderWidth: 1,
    borderRadius: 6,
    color: colors.textPrimary,
    fontSize: 15,
    fontFamily: FONTS.monoRegular,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  targetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.panelRecessed,
    borderColor: colors.borderSubtle,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  targetLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: FONTS.monoBold,
    letterSpacing: 1,
  },
  targetValue: {
    color: colors.accent,
    fontSize: 20,
    fontFamily: FONTS.displayLight,
    fontVariant: ['tabular-nums'],
  },
});

export default CollapsibleCalculator;
