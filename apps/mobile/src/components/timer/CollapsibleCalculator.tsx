import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { ChevronDown, ChevronUp, Calculator, Check } from 'lucide-react-native';
import { INDUSTRIAL_PRECISION_THEME, calculateWaterAmount } from '@brewlog/core';
import { mobileFeedback } from '../../lib/mobileFeedback';
import { FONTS } from '../../theme/fonts';

const { colors } = INDUSTRIAL_PRECISION_THEME;

export interface CollapsibleCalculatorProps {
  initialDose?: number;
  initialRatio?: number;
  defaultDose?: number;
  defaultRatio?: number;
  onApplyDose?: (dose: number) => void;
}

export const CollapsibleCalculator: React.FC<CollapsibleCalculatorProps> = ({
  initialDose = 18,
  initialRatio = 16,
  defaultDose,
  defaultRatio,
  onApplyDose,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [dose, setDose] = useState((defaultDose ?? initialDose).toString());
  const [ratio, setRatio] = useState((defaultRatio ?? initialRatio).toString());
  const [isApplied, setIsApplied] = useState(false);
  const appliedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDose((defaultDose ?? initialDose).toString());
  }, [initialDose, defaultDose]);

  useEffect(() => {
    setRatio((defaultRatio ?? initialRatio).toString());
  }, [initialRatio, defaultRatio]);

  useEffect(() => {
    return () => {
      if (appliedTimeoutRef.current) {
        clearTimeout(appliedTimeoutRef.current);
      }
    };
  }, []);

  const handleDoseChange = (text: string) => {
    setDose(text);
    if (isApplied) setIsApplied(false);
  };

  const handleRatioChange = (text: string) => {
    setRatio(text);
    if (isApplied) setIsApplied(false);
  };

  const doseNum = parseFloat(dose) || 0;
  const ratioNum = parseFloat(ratio) || 0;
  const targetWater = calculateWaterAmount(doseNum, ratioNum);

  const handleApply = () => {
    if (doseNum > 0 && onApplyDose) {
      onApplyDose(doseNum);
      mobileFeedback.triggerHapticTap();
      setIsApplied(true);
      if (appliedTimeoutRef.current) {
        clearTimeout(appliedTimeoutRef.current);
      }
      appliedTimeoutRef.current = setTimeout(() => {
        setIsApplied(false);
      }, 1500);
    }
  };

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
                onChangeText={handleDoseChange}
                keyboardType="decimal-pad"
                placeholderTextColor={colors.textMuted}
                accessibilityLabel="Coffee dose in grams"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>RATIO (1:X)</Text>
              <TextInput
                style={styles.input}
                value={ratio}
                onChangeText={handleRatioChange}
                keyboardType="decimal-pad"
                placeholderTextColor={colors.textMuted}
                accessibilityLabel="Brew ratio 1 to X"
              />
            </View>
          </View>

          <View style={styles.targetRow}>
            <Text style={styles.targetLabel}>TARGET WATER</Text>
            <Text style={styles.targetValue}>{targetWater.toFixed(1)}g</Text>
          </View>

          {onApplyDose && (
            <Pressable
              onPress={handleApply}
              disabled={doseNum <= 0}
              style={[
                styles.applyButton,
                isApplied && styles.applyButtonSuccess,
                doseNum <= 0 && styles.applyButtonDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                isApplied
                  ? `Dose ${doseNum}g applied to timer`
                  : 'Apply dose to timer'
              }
            >
              <View style={styles.applyButtonContent}>
                {isApplied && (
                  <Check
                    size={14}
                    color={colors.statusSuccess}
                    strokeWidth={2.5}
                  />
                )}
                <Text
                  style={[
                    styles.applyButtonText,
                    isApplied && styles.applyButtonTextSuccess,
                    doseNum <= 0 && styles.applyButtonTextDisabled,
                  ]}
                >
                  {isApplied
                    ? `DOSE APPLIED (${doseNum}g)`
                    : `APPLY DOSE TO TIMER (${doseNum}g)`}
                </Text>
              </View>
            </Pressable>
          )}
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
    fontFamily: FONTS.monoMedium,
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
  applyButton: {
    backgroundColor: colors.panelRecessed,
    borderColor: colors.borderActive,
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  applyButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  applyButtonSuccess: {
    borderColor: colors.statusSuccess,
  },
  applyButtonDisabled: {
    borderColor: colors.borderSubtle,
    opacity: 0.5,
  },
  applyButtonText: {
    color: colors.accent,
    fontSize: 11,
    fontFamily: FONTS.monoBold,
    letterSpacing: 1,
  },
  applyButtonTextSuccess: {
    color: colors.statusSuccess,
  },
  applyButtonTextDisabled: {
    color: colors.textMuted,
  },
});

export default CollapsibleCalculator;
