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
  initialDose?: number;
  initialRatio?: number;
  initialWater?: number;
  defaultDose?: number;
  defaultRatio?: number;
  defaultWater?: number;
  onApplyDose?: (dose: number, ratio?: number, water?: number) => void;
}

export const CollapsibleCalculator: React.FC<CollapsibleCalculatorProps> = ({
  initialDose = 18,
  initialRatio = 16,
  initialWater,
  defaultDose,
  defaultRatio,
  defaultWater,
  onApplyDose,
}) => {
  const baseDose = defaultDose ?? initialDose;
  const baseRatio = defaultRatio ?? initialRatio;
  const baseWater = defaultWater ?? initialWater ?? calculateWaterAmount(baseDose, baseRatio);

  const [isExpanded, setIsExpanded] = useState(false);
  const [dose, setDose] = useState(baseDose.toString());
  const [ratio, setRatio] = useState(baseRatio.toString());
  const [isApplied, setIsApplied] = useState(false);
  const appliedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isTranslatorOpen, setIsTranslatorOpen] = useState(false);
  const [sourceCoffee, setSourceCoffee] = useState(baseDose.toString());
  const [sourceWater, setSourceWater] = useState(baseWater.toString());
  const [targetCoffee, setTargetCoffee] = useState(baseDose.toString());
  const [targetWater, setTargetWater] = useState(baseWater.toString());

  useEffect(() => {
    setDose((defaultDose ?? initialDose).toString());
  }, [initialDose, defaultDose]);

  useEffect(() => {
    setRatio((defaultRatio ?? initialRatio).toString());
  }, [initialRatio, defaultRatio]);

  useEffect(() => {
    const d = defaultDose ?? initialDose;
    const r = defaultRatio ?? initialRatio;
    const w = defaultWater ?? initialWater ?? calculateWaterAmount(d, r);
    setSourceCoffee(d.toString());
    setSourceWater(w.toString());
    setTargetCoffee(d.toString());
    setTargetWater(w.toString());
  }, [initialDose, defaultDose, initialRatio, defaultRatio, initialWater, defaultWater]);

  useEffect(() => {
    return () => {
      if (appliedTimeoutRef.current) {
        clearTimeout(appliedTimeoutRef.current);
      }
    };
  }, []);

  const parsedSourceCoffee = parseFloat(sourceCoffee) || 0;
  const parsedSourceWater = parseFloat(sourceWater) || 0;
  const impliedRatio = calculateRatio(parsedSourceCoffee, parsedSourceWater);
  const parsedTargetCoffee = parseFloat(targetCoffee) || 0;
  const parsedTargetWater = parseFloat(targetWater) || 0;

  const doseNum = parseFloat(dose) || 0;
  const ratioNum = parseFloat(ratio) || 0;
  const mainTargetWater = calculateWaterAmount(doseNum, ratioNum);

  const activeDose = isTranslatorOpen && parsedTargetCoffee > 0 ? parsedTargetCoffee : doseNum;
  const activeRatio = isTranslatorOpen && impliedRatio > 0 ? impliedRatio : ratioNum;
  const activeWater = isTranslatorOpen && parsedTargetWater > 0 ? parsedTargetWater : mainTargetWater;
  const roundedActiveDose = Number(activeDose.toFixed(1));

  const handleDoseChange = (text: string) => {
    setDose(text);
    if (isApplied) setIsApplied(false);
    const tc = parseFloat(text) || 0;
    const sc = parseFloat(sourceCoffee) || 0;
    const sw = parseFloat(sourceWater) || 0;
    if (tc > 0 && sc > 0 && sw > 0) {
      setTargetCoffee(text);
      const res = solveProportionalScale({ sourceCoffee: sc, sourceWater: sw, targetCoffee: tc });
      setTargetWater(res.targetWater.toString());
    } else if (tc <= 0) {
      setTargetCoffee('0');
      setTargetWater('0');
    }
  };

  const handleRatioChange = (text: string) => {
    setRatio(text);
    if (isApplied) setIsApplied(false);
  };

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
      setDose(text);
    } else if (tc <= 0) {
      setTargetWater('0');
      setDose('0');
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
      setDose(res.targetCoffee.toString());
    } else if (tw <= 0) {
      setTargetCoffee('0');
      setDose('0');
    }
  };

  const handleApply = () => {
    if (activeDose > 0 && onApplyDose) {
      const doseToApply = roundedActiveDose;
      const ratioToApply = activeRatio > 0 ? activeRatio : undefined;
      const waterToApply = activeWater > 0 ? Math.round(activeWater) : undefined;
      onApplyDose(doseToApply, ratioToApply, waterToApply);
      setDose(doseToApply.toString());
      if (ratioToApply !== undefined) {
        setRatio(ratioToApply.toString());
      }
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
          <Scale size={15} color={colors.accent} />
          <Text style={styles.title}>RATIO CALCULATOR</Text>
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
            <Text style={styles.targetValue}>{mainTargetWater.toFixed(1)}g</Text>
          </View>

          {/* Converter Toggle Header (Moved above apply button, no inner card) */}
          <Pressable
            onPress={() => setIsTranslatorOpen((prev) => !prev)}
            style={styles.translatorToggle}
            accessibilityRole="button"
            accessibilityLabel="Toggle Ratio Converter"
            accessibilityState={{ expanded: isTranslatorOpen }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.translatorTitle}>CONVERTER</Text>
            {isTranslatorOpen ? (
              <ChevronUp size={14} color={colors.textMuted} />
            ) : (
              <ChevronDown size={14} color={colors.textMuted} />
            )}
          </Pressable>

          {/* Converter Body (Expanded without inner card wrapper) */}
          {isTranslatorOpen && (
            <View style={styles.translatorBody}>
              {/* Baseline Recipe Inputs */}
              <View style={styles.translatorSection}>
                <View style={styles.translatorInputRow}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>SOURCE COFFEE (G)</Text>
                    <TextInput
                      style={styles.input}
                      value={sourceCoffee}
                      onChangeText={handleSourceCoffeeChange}
                      keyboardType="decimal-pad"
                      placeholderTextColor={colors.textMuted}
                      accessibilityLabel="Baseline coffee dose in grams"
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
                      accessibilityLabel="Baseline water amount in grams"
                    />
                  </View>
                </View>
              </View>

              {/* Target Solver */}
              <View style={styles.translatorSection}>
                <View style={styles.translatorInputRow}>
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
              </View>
            </View>
          )}

          {/* Unified Apply Dose Button at Bottom */}
          {onApplyDose && (
            <Pressable
              onPress={handleApply}
              disabled={roundedActiveDose <= 0}
              style={[
                styles.applyButton,
                isApplied && styles.applyButtonSuccess,
                roundedActiveDose <= 0 && styles.applyButtonDisabled,
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
                    roundedActiveDose <= 0 && styles.applyButtonTextDisabled,
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
    fontFamily: FONTS.sansMedium,
    fontVariant: ['tabular-nums'],
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
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
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
  translatorToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    paddingBottom: 2,
    minHeight: 32,
  },
  translatorTitle: {
    color: colors.textSecondary,
    fontSize: 10,
    fontFamily: FONTS.monoBold,
    letterSpacing: 1.1,
  },
  translatorBody: {
    gap: 10,
    marginTop: -4,
    paddingBottom: 4,
  },
  translatorSection: {
    gap: 8,
  },
  translatorInputRow: {
    flexDirection: 'row',
    gap: 12,
  },
});

export default CollapsibleCalculator;
