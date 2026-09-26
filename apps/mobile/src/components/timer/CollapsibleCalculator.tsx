import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { ChevronDown, ChevronUp, Calculator, Check } from 'lucide-react-native';
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
  defaultDose?: number;
  defaultRatio?: number;
  onApplyDose?: (dose: number, ratio?: number, water?: number) => void;
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

  // Nested ratio translator state
  const [isTranslatorOpen, setIsTranslatorOpen] = useState(false);
  const [sourceCoffee, setSourceCoffee] = useState('20');
  const [sourceWater, setSourceWater] = useState('320');
  const [targetCoffee, setTargetCoffee] = useState('18');
  const [targetWater, setTargetWater] = useState('288');
  const [isTranslatorApplied, setIsTranslatorApplied] = useState(false);
  const translatorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      if (translatorTimeoutRef.current) {
        clearTimeout(translatorTimeoutRef.current);
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
  const mainTargetWater = calculateWaterAmount(doseNum, ratioNum);

  const handleApply = () => {
    if (doseNum > 0 && onApplyDose) {
      onApplyDose(
        doseNum,
        ratioNum > 0 ? ratioNum : undefined,
        mainTargetWater > 0 ? mainTargetWater : undefined
      );
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

  const parsedSourceCoffee = parseFloat(sourceCoffee) || 0;
  const parsedSourceWater = parseFloat(sourceWater) || 0;
  const impliedRatio = calculateRatio(parsedSourceCoffee, parsedSourceWater);
  const parsedTargetCoffee = parseFloat(targetCoffee) || 0;
  const parsedTargetWater = parseFloat(targetWater) || 0;

  const handleSourceCoffeeChange = (text: string) => {
    setSourceCoffee(text);
    if (isTranslatorApplied) setIsTranslatorApplied(false);
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
    if (isTranslatorApplied) setIsTranslatorApplied(false);
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
    if (isTranslatorApplied) setIsTranslatorApplied(false);
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
    if (isTranslatorApplied) setIsTranslatorApplied(false);
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

  const handleApplyTranslator = () => {
    if (parsedTargetCoffee > 0 && onApplyDose) {
      const doseToApply = Number(parsedTargetCoffee.toFixed(1));
      const ratioToApply = impliedRatio > 0 ? impliedRatio : undefined;
      const waterToApply = parsedTargetWater > 0 ? parsedTargetWater : undefined;
      onApplyDose(doseToApply, ratioToApply, waterToApply);
      setDose(doseToApply.toString());
      if (impliedRatio > 0) {
        setRatio(impliedRatio.toString());
      }
      mobileFeedback.triggerHapticTap();
      setIsTranslatorApplied(true);
      if (translatorTimeoutRef.current) {
        clearTimeout(translatorTimeoutRef.current);
      }
      translatorTimeoutRef.current = setTimeout(() => {
        setIsTranslatorApplied(false);
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
            {doseNum}g @ 1:{ratioNum} ➔ {mainTargetWater.toFixed(1)}g
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
            <Text style={styles.targetValue}>{mainTargetWater.toFixed(1)}g</Text>
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

          {/* Nested Ratio Translator Accordion */}
          <View style={styles.translatorCard}>
            <Pressable
              onPress={() => setIsTranslatorOpen((prev) => !prev)}
              style={styles.translatorHeader}
              accessibilityRole="button"
              accessibilityLabel="Toggle Ratio Translator"
              accessibilityState={{ expanded: isTranslatorOpen }}
            >
              <Text style={styles.translatorTitle}>CONVERTER</Text>
              {isTranslatorOpen ? (
                <ChevronUp size={14} color={colors.textMuted} />
              ) : (
                <ChevronDown size={14} color={colors.textMuted} />
              )}
            </Pressable>

            {isTranslatorOpen && (
              <View style={styles.translatorBody}>
                {/* Baseline Recipe */}
                <View style={styles.translatorSection}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionHeaderTitle}>BASELINE RECIPE</Text>
                    <Text style={styles.ratioBadge}>
                      1:{impliedRatio > 0 ? impliedRatio.toFixed(1) : '—'}
                    </Text>
                  </View>
                  <View style={styles.inputRow}>
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
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionHeaderTitle}>TARGET SOLVER</Text>
                  </View>
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
                  <View style={styles.translatorTargetRow}>
                    <Text style={styles.translatorTargetWaterText}>
                      Target Water: {targetWater}g
                    </Text>
                  </View>
                </View>

                {onApplyDose && (
                  <Pressable
                    onPress={handleApplyTranslator}
                    disabled={parsedTargetCoffee <= 0}
                    style={[
                      styles.applyButton,
                      isTranslatorApplied && styles.applyButtonSuccess,
                      parsedTargetCoffee <= 0 && styles.applyButtonDisabled,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={
                      isTranslatorApplied
                        ? `Translator dose ${parsedTargetCoffee}g applied to timer`
                        : 'Apply translator dose to timer'
                    }
                  >
                    <View style={styles.applyButtonContent}>
                      {isTranslatorApplied && (
                        <Check
                          size={14}
                          color={colors.statusSuccess}
                          strokeWidth={2.5}
                        />
                      )}
                      <Text
                        style={[
                          styles.applyButtonText,
                          isTranslatorApplied && styles.applyButtonTextSuccess,
                          parsedTargetCoffee <= 0 && styles.applyButtonTextDisabled,
                        ]}
                      >
                        {isTranslatorApplied
                          ? `TRANSLATOR DOSE APPLIED (${parsedTargetCoffee}g)`
                          : `APPLY TRANSLATOR DOSE (${parsedTargetCoffee}g)`}
                      </Text>
                    </View>
                  </Pressable>
                )}
              </View>
            )}
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
  summaryBadge: {
    color: colors.textPrimary,
    fontSize: 11,
    fontFamily: FONTS.sansMedium,
    fontVariant: ['tabular-nums'],
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
  translatorCard: {
    backgroundColor: colors.panelRecessed,
    borderColor: colors.borderSubtle,
    borderWidth: 1,
    borderRadius: 6,
    overflow: 'hidden',
    marginTop: 6,
  },
  translatorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    backgroundColor: colors.panelRecessed,
  },
  translatorTitle: {
    color: colors.textSecondary,
    fontSize: 10,
    fontFamily: FONTS.monoBold,
    letterSpacing: 1.1,
  },
  translatorBody: {
    padding: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    backgroundColor: colors.panel,
  },
  translatorSection: {
    gap: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeaderTitle: {
    color: colors.textSecondary,
    fontSize: 10,
    fontFamily: FONTS.monoBold,
    letterSpacing: 1,
  },
  ratioBadge: {
    color: colors.accent,
    fontSize: 11,
    fontFamily: FONTS.monoMedium,
    fontVariant: ['tabular-nums'],
    backgroundColor: colors.panelRecessed,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  translatorTargetRow: {
    backgroundColor: colors.panelRecessed,
    borderColor: colors.borderSubtle,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    marginTop: 2,
  },
  translatorTargetWaterText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontFamily: FONTS.sansMedium,
    fontVariant: ['tabular-nums'],
  },
});

export default CollapsibleCalculator;
