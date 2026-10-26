import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { ChevronDown, ChevronUp, Scale, Check } from 'lucide-react-native';
import {
  INDUSTRIAL_PRECISION_THEME,
  calculateWaterAmount,
  calculateRatio,
  solveProportionalScale,
} from '@brewlog/core';
import { mobileFeedback } from '../../lib/mobileFeedback';
import { FONTS } from '../../theme/fonts';

const { colors } = INDUSTRIAL_PRECISION_THEME;

export interface CollapsibleCalculatorProps {
  currentDose?: number;
  baseCoffee?: number;
  baseWater?: number;
  initialDose?: number;
  initialRatio?: number;
  initialWater?: number;
  defaultDose?: number;
  defaultRatio?: number;
  defaultWater?: number;
  onApplyDose?: (dose: number, ratio?: number, water?: number) => void;
}

export type RatioTranslatorProps = CollapsibleCalculatorProps;

export const CollapsibleCalculator: React.FC<CollapsibleCalculatorProps> = ({
  currentDose,
  baseCoffee,
  baseWater,
  initialDose = 20,
  initialRatio = 16,
  initialWater,
  defaultDose,
  defaultRatio,
  defaultWater,
  onApplyDose,
}) => {
  const effectiveBaseCoffee = baseCoffee ?? defaultDose ?? initialDose ?? currentDose ?? 20;
  const effectiveRatio = defaultRatio ?? initialRatio;
  const effectiveBaseWater =
    baseWater ??
    defaultWater ??
    initialWater ??
    (effectiveRatio ? calculateWaterAmount(effectiveBaseCoffee, effectiveRatio) : 300);
  const effectiveTargetCoffee = currentDose ?? effectiveBaseCoffee;

  const [isExpanded, setIsExpanded] = useState(false);
  const [sourceCoffee, setSourceCoffee] = useState(effectiveBaseCoffee.toString());
  const [sourceWater, setSourceWater] = useState(effectiveBaseWater.toString());
  const [targetCoffee, setTargetCoffee] = useState(effectiveTargetCoffee.toString());
  const [targetWater, setTargetWater] = useState(() => {
    const res = solveProportionalScale({
      sourceCoffee: effectiveBaseCoffee,
      sourceWater: effectiveBaseWater,
      targetCoffee: effectiveTargetCoffee,
    });
    return res.targetWater.toString();
  });
  const [isApplied, setIsApplied] = useState(false);
  const appliedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (appliedTimeoutRef.current) {
        clearTimeout(appliedTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const sc = baseCoffee ?? defaultDose ?? initialDose ?? currentDose ?? 20;
    const r = defaultRatio ?? initialRatio;
    const sw =
      baseWater ??
      defaultWater ??
      initialWater ??
      (r ? calculateWaterAmount(sc, r) : 300);
    const tc = currentDose ?? sc;

    setSourceCoffee(sc.toString());
    setSourceWater(sw.toString());
    setTargetCoffee(tc.toString());
    const res = solveProportionalScale({
      sourceCoffee: sc,
      sourceWater: sw,
      targetCoffee: tc,
    });
    setTargetWater(res.targetWater.toString());
  }, [
    baseCoffee,
    baseWater,
    currentDose,
    initialDose,
    initialRatio,
    initialWater,
    defaultDose,
    defaultRatio,
    defaultWater,
  ]);

  const handleSourceCoffeeChange = (text: string) => {
    setSourceCoffee(text);
    if (isApplied) setIsApplied(false);
    const sc = parseFloat(text) || 0;
    const sw = parseFloat(sourceWater) || 0;
    const tc = parseFloat(targetCoffee) || 0;
    if (sc > 0 && sw > 0 && tc > 0) {
      const res = solveProportionalScale({ sourceCoffee: sc, sourceWater: sw, targetCoffee: tc });
      setTargetWater(res.targetWater.toString());
    }
  };

  const handleSourceWaterChange = (text: string) => {
    setSourceWater(text);
    if (isApplied) setIsApplied(false);
    const sw = parseFloat(text) || 0;
    const sc = parseFloat(sourceCoffee) || 0;
    const tc = parseFloat(targetCoffee) || 0;
    if (sc > 0 && sw > 0 && tc > 0) {
      const res = solveProportionalScale({ sourceCoffee: sc, sourceWater: sw, targetCoffee: tc });
      setTargetWater(res.targetWater.toString());
    }
  };

  const handleTargetCoffeeChange = (text: string) => {
    setTargetCoffee(text);
    if (isApplied) setIsApplied(false);
    const tc = parseFloat(text) || 0;
    const sc = parseFloat(sourceCoffee) || 0;
    const sw = parseFloat(sourceWater) || 0;
    if (tc > 0 && sc > 0 && sw > 0) {
      const res = solveProportionalScale({ sourceCoffee: sc, sourceWater: sw, targetCoffee: tc });
      setTargetWater(res.targetWater.toString());
    } else if (tc <= 0) {
      setTargetWater('0');
    }
  };

  const handleTargetWaterChange = (text: string) => {
    setTargetWater(text);
    if (isApplied) setIsApplied(false);
    const tw = parseFloat(text) || 0;
    const sc = parseFloat(sourceCoffee) || 0;
    const sw = parseFloat(sourceWater) || 0;
    if (tw > 0 && sc > 0 && sw > 0) {
      const res = solveProportionalScale({ sourceCoffee: sc, sourceWater: sw, targetWater: tw });
      setTargetCoffee(res.targetCoffee.toString());
    } else if (tw <= 0) {
      setTargetCoffee('0');
    }
  };

  const parsedSourceCoffee = parseFloat(sourceCoffee) || 0;
  const parsedSourceWater = parseFloat(sourceWater) || 0;
  const impliedRatio = calculateRatio(parsedSourceCoffee, parsedSourceWater);
  const parsedTargetCoffee = parseFloat(targetCoffee) || 0;
  const parsedTargetWater = parseFloat(targetWater) || 0;
  const roundedTargetCoffee = Number(parsedTargetCoffee.toFixed(1));

  const handleApply = () => {
    if (roundedTargetCoffee > 0 && onApplyDose) {
      const doseToApply = roundedTargetCoffee;
      const ratioToApply = impliedRatio > 0 ? impliedRatio : undefined;
      const waterToApply = parsedTargetWater > 0 ? Math.round(parsedTargetWater) : undefined;
      onApplyDose(doseToApply, ratioToApply, waterToApply);
      setTargetCoffee(doseToApply.toString());
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
      {/* Header Accordion Toggle */}
      <Pressable
        onPress={() => setIsExpanded((prev) => !prev)}
        style={styles.header}
        accessibilityRole="button"
        accessibilityLabel="Toggle Ratio Calculator"
        accessibilityState={{ expanded: isExpanded }}
      >
        <View style={styles.headerLeft}>
          <Scale size={15} color={colors.accent} />
          <Text style={styles.title}>RATIO CALCULATOR</Text>
        </View>
        {isExpanded ? (
          <ChevronUp size={16} color={colors.textMuted} />
        ) : (
          <ChevronDown size={16} color={colors.textMuted} />
        )}
      </Pressable>

      {/* Single-Tier Collapsible Content */}
      {isExpanded && (
        <View style={styles.body}>
          <Text style={styles.subtitle}>
            Translate recipe dose & water proportionally to match your target coffee dose.
          </Text>

          {/* Source Recipe Inputs */}
          <View style={styles.inputRow}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>SOURCE COFFEE (G)</Text>
              <TextInput
                style={styles.input}
                value={sourceCoffee}
                onChangeText={handleSourceCoffeeChange}
                keyboardType="decimal-pad"
                placeholderTextColor={colors.textMuted}
                accessibilityLabel="Source coffee dose in grams"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>SOURCE WATER (G)</Text>
              <TextInput
                style={styles.input}
                value={sourceWater}
                onChangeText={handleSourceWaterChange}
                keyboardType="decimal-pad"
                placeholderTextColor={colors.textMuted}
                accessibilityLabel="Source water amount in grams"
              />
            </View>
          </View>

          {/* Target Solved Inputs */}
          <View style={styles.inputRow}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>TARGET COFFEE (G)</Text>
              <TextInput
                style={styles.input}
                value={targetCoffee}
                onChangeText={handleTargetCoffeeChange}
                keyboardType="decimal-pad"
                placeholderTextColor={colors.textMuted}
                accessibilityLabel="Target coffee dose in grams"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>TARGET WATER (G)</Text>
              <TextInput
                style={styles.input}
                value={targetWater}
                onChangeText={handleTargetWaterChange}
                keyboardType="decimal-pad"
                placeholderTextColor={colors.textMuted}
                accessibilityLabel="Target water amount in grams"
              />
            </View>
          </View>

          {/* Apply Dose Button */}
          {onApplyDose && (
            <Pressable
              onPress={handleApply}
              disabled={roundedTargetCoffee <= 0}
              style={[
                styles.applyButton,
                isApplied && styles.applyButtonSuccess,
                roundedTargetCoffee <= 0 && styles.applyButtonDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                isApplied ? 'Dose applied to timer' : 'Apply dose to timer'
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
                    roundedTargetCoffee <= 0 && styles.applyButtonTextDisabled,
                  ]}
                >
                  {isApplied ? 'DOSE APPLIED' : 'APPLY DOSE'}
                </Text>
              </View>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
};

export const RatioTranslator = CollapsibleCalculator;
export default CollapsibleCalculator;

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
    minHeight: 44,
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
  body: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    gap: 12,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: FONTS.sansRegular,
    lineHeight: 16,
    marginTop: 10,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
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
    fontFamily: FONTS.sansMedium,
    fontVariant: ['tabular-nums'],
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  applyButton: {
    backgroundColor: colors.panelRecessed,
    borderColor: colors.borderActive,
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 10,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
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
