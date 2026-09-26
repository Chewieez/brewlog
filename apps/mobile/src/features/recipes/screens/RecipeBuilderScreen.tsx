import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
  StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X,
  Check,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
} from 'lucide-react-native';
import {
  INDUSTRIAL_PRECISION_THEME,
  BrewMethodType,
  StageType,
  BrewStage,
  calculateWaterAmount,
  calculateRatio,
} from '@brewlog/core';
import { useRecipes } from '../RecipeContext';
import { recalculateTiming, calculateTotalBrewTime } from '../utils/timingUtils';
import { FONTS } from '../../../theme/fonts';

const { colors } = INDUSTRIAL_PRECISION_THEME;

const METHODS: { label: string; value: BrewMethodType }[] = [
  { label: 'V60', value: 'v60' },
  { label: 'AeroPress', value: 'aeropress' },
  { label: 'Chemex', value: 'chemex' },
  { label: 'French Press', value: 'french-press' },
  { label: 'Flair', value: 'flair' },
  { label: 'Kalita', value: 'kalita-wave' },
  { label: 'Custom', value: 'custom' },
];

const STAGE_TYPES: { label: string; value: StageType }[] = [
  { label: 'Bloom', value: 'bloom' },
  { label: 'Pour', value: 'pour' },
  { label: 'Agitation', value: 'agitation' },
  { label: 'Drawdown', value: 'drawdown' },
  { label: 'Press', value: 'press' },
  { label: 'Other', value: 'other' },
];

const RATIO_PRESETS = [15, 16, 16.67, 17];

const DEFAULT_STAGES: BrewStage[] = [
  {
    id: 'stage-1',
    name: 'Bloom',
    stageType: 'bloom',
    startSecond: 0,
    durationSeconds: 45,
    targetWaterWeightGrams: 50,
    instruction: 'Saturate coffee bed completely',
  },
  {
    id: 'stage-2',
    name: 'Main Pour',
    stageType: 'pour',
    startSecond: 45,
    durationSeconds: 45,
    targetWaterWeightGrams: 250,
    instruction: 'Gentle spiral pour outward',
  },
  {
    id: 'stage-3',
    name: 'Drawdown',
    stageType: 'drawdown',
    startSecond: 90,
    durationSeconds: 60,
    targetWaterWeightGrams: 250,
    instruction: 'Allow bed to drain flat',
  },
];

export const RecipeBuilderScreen: React.FC = () => {
  const router = useRouter();
  const {
    editId,
    duplicateId,
    stages: paramStages,
    initialDose,
    initialWater,
    initialMethod,
  } = useLocalSearchParams<{
    editId?: string;
    duplicateId?: string;
    stages?: string;
    initialDose?: string;
    initialWater?: string;
    initialMethod?: string;
  }>();
  const { recipes, addRecipe, updateRecipe } = useRecipes();

  const sourceRecipe = editId
    ? recipes.find((r) => r.id === editId)
    : duplicateId
    ? recipes.find((r) => r.id === duplicateId)
    : null;

  const parsedParamStages = React.useMemo(() => {
    if (!paramStages) return null;
    try {
      const parsed = JSON.parse(paramStages);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return recalculateTiming(parsed);
      }
    } catch {
      // ignore JSON parse failure and fallback to defaults
    }
    return null;
  }, [paramStages]);

  const initialDoseNum = parseFloat(initialDose || '') || 0;
  const initialWaterNum = parseFloat(initialWater || '') || 0;
  const computedRatio =
    initialDoseNum > 0 && initialWaterNum > 0
      ? calculateRatio(initialDoseNum, initialWaterNum)
      : null;

  const matchedMethod: BrewMethodType | null =
    initialMethod && METHODS.some((m) => m.value === initialMethod.toLowerCase())
      ? (initialMethod.toLowerCase() as BrewMethodType)
      : null;

  const [name, setName] = useState<string>(
    sourceRecipe
      ? duplicateId
        ? `${sourceRecipe.name} (Copy)`
        : sourceRecipe.name
      : ''
  );
  const [author, setAuthor] = useState<string>(sourceRecipe?.author || '');
  const [brewMethod, setBrewMethod] = useState<BrewMethodType>(
    sourceRecipe?.brewMethod || matchedMethod || 'v60'
  );

  // Use string state for numeric inputs to avoid snapping decimal keystrokes (e.g. "15." or "16.5")
  const [doseText, setDoseText] = useState<string>(
    sourceRecipe
      ? String(sourceRecipe.coffeeDoseGrams)
      : initialDose
      ? String(initialDose)
      : '15'
  );
  const [ratioText, setRatioText] = useState<string>(
    sourceRecipe
      ? String(sourceRecipe.ratio)
      : computedRatio
      ? String(computedRatio)
      : '16.67'
  );
  const [grindSize, setGrindSize] = useState<string>(
    sourceRecipe?.grindSize || 'Medium-Fine'
  );
  const [waterTempText, setWaterTempText] = useState<string>(
    sourceRecipe ? String(sourceRecipe.waterTempCelsius) : '93'
  );
  const [description, setDescription] = useState<string>(
    sourceRecipe?.description || ''
  );
  const [notes, setNotes] = useState<string>(sourceRecipe?.notes || '');
  const [stages, setStages] = useState<BrewStage[]>(
    sourceRecipe
      ? recalculateTiming(sourceRecipe.stages)
      : parsedParamStages || DEFAULT_STAGES
  );

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const coffeeDoseGrams = parseFloat(doseText) || 0;
  const ratio = parseFloat(ratioText) || 0;
  const waterTempCelsius = parseInt(waterTempText, 10) || 0;

  const calculatedWater = calculateWaterAmount(coffeeDoseGrams, ratio);
  const totalBrewTime = calculateTotalBrewTime(stages);

  const handleAddStage = () => {
    const nextIdx = stages.length + 1;
    const newStage: BrewStage = {
      id: `new-stage-${Date.now()}`,
      name: `Stage ${nextIdx}`,
      stageType: 'pour',
      startSecond: 0,
      durationSeconds: 30,
      targetWaterWeightGrams: calculatedWater,
      instruction: '',
    };
    setStages(recalculateTiming([...stages, newStage]));
  };

  const handleRemoveStage = (idx: number) => {
    const filtered = stages.filter((_, i) => i !== idx);
    setStages(recalculateTiming(filtered));
  };

  const handleMoveStage = (idx: number, delta: number) => {
    const targetIdx = idx + delta;
    if (targetIdx < 0 || targetIdx >= stages.length) return;
    const reordered = [...stages];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(targetIdx, 0, moved);
    setStages(recalculateTiming(reordered));
  };

  const handleUpdateStage = (idx: number, patch: Partial<BrewStage>) => {
    const updated = stages.map((st, i) => (i === idx ? { ...st, ...patch } : st));
    setStages(patch.durationSeconds !== undefined ? recalculateTiming(updated) : updated);
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      setErrorMessage('Recipe name is required.');
      return;
    }
    if (coffeeDoseGrams < 1 || coffeeDoseGrams > 100) {
      setErrorMessage('Coffee dose must be between 1g and 100g.');
      return;
    }
    if (ratio < 1 || ratio > 30) {
      setErrorMessage('Brew ratio must be between 1:1 and 1:30.');
      return;
    }
    if (stages.length === 0 || !stages.some((s) => s.durationSeconds > 0)) {
      setErrorMessage('Recipe must have at least one stage with a duration greater than 0s.');
      return;
    }

    setErrorMessage(null);

    const payload = {
      name: trimmedName,
      author: author.trim() || undefined,
      brewMethod,
      coffeeDoseGrams,
      ratio,
      waterAmountGrams: calculatedWater,
      grindSize: grindSize.trim() || 'Medium',
      waterTempCelsius,
      totalTimeSeconds: totalBrewTime,
      description: description.trim(),
      notes: notes.trim() || undefined,
      stages,
    };

    try {
      if (editId) {
        await updateRecipe(editId, payload);
        router.back();
      } else {
        const created = await addRecipe(payload);
        router.replace(`/recipe/${created.id}`);
      }
    } catch (err: any) {
      const msg = err?.message || 'An unexpected error occurred while saving the recipe.';
      setErrorMessage(msg);
      Alert.alert('Save Failed', msg);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Discard Changes?',
      'Any unsaved recipe customizations will be lost.',
      [
        { text: 'Keep Editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => router.back() },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
      <View style={styles.navHeader}>
        <Pressable
          onPress={handleCancel}
          style={styles.navButton}
          accessibilityRole="button"
          accessibilityLabel="Cancel editing"
        >
          <X size={20} color={colors.textSecondary} />
        </Pressable>
        <Text style={styles.navTitle}>
          {editId ? 'Edit Recipe' : duplicateId ? 'Duplicate Recipe' : 'New Recipe'}
        </Text>
        <Pressable
          onPress={handleSave}
          style={styles.saveButton}
          accessibilityRole="button"
          accessibilityLabel="Save Recipe"
        >
          <Check size={18} color={colors.canvas} />
          <Text style={styles.saveButtonText}>SAVE RECIPE</Text>
        </Pressable>
      </View>

      {errorMessage ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{errorMessage}</Text>
        </View>
      ) : null}

      {/* Section 1: Overview */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionHeader}>RECIPE OVERVIEW</Text>

        <Text style={styles.fieldLabel}>RECIPE NAME *</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. My Morning V60"
          placeholderTextColor={colors.textMuted}
          numberOfLines={1}
          style={styles.textInput}
        />

        <Text style={styles.fieldLabel}>AUTHOR / BARISTA</Text>
        <TextInput
          value={author}
          onChangeText={setAuthor}
          placeholder="e.g. James Hoffmann"
          placeholderTextColor={colors.textMuted}
          numberOfLines={1}
          style={styles.textInput}
        />

        <Text style={styles.fieldLabel}>BREW METHOD</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.methodRow}>
          {METHODS.map((m) => {
            const isSelected = brewMethod === m.value;
            return (
              <Pressable
                key={m.value}
                onPress={() => setBrewMethod(m.value)}
                style={[styles.methodPill, isSelected ? styles.methodPillActive : styles.methodPillInactive]}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`Select brew method ${m.label}`}
              >
                <Text style={[styles.methodPillText, isSelected ? styles.methodPillTextActive : styles.methodPillTextInactive]}>
                  {m.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={styles.fieldLabel}>DESCRIPTION</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Tasting goals, extraction notes..."
          placeholderTextColor={colors.textMuted}
          multiline
          style={[styles.textInput, styles.multilineInput]}
        />

        <Text style={styles.fieldLabel}>NOTES</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Personal notes, water specs, grinder settings..."
          placeholderTextColor={colors.textMuted}
          multiline
          style={[styles.textInput, styles.multilineInput]}
        />
      </View>

      {/* Section 2: Dose & Ratio */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionHeader}>DOSE & WATER RATIO</Text>

        <View style={styles.row}>
          <View style={styles.halfField}>
            <Text style={styles.fieldLabel}>DOSE (G)</Text>
            <TextInput
              value={doseText}
              onChangeText={setDoseText}
              keyboardType="decimal-pad"
              style={styles.textInput}
            />
          </View>
          <View style={styles.halfField}>
            <Text style={styles.fieldLabel}>RATIO (1:X)</Text>
            <TextInput
              value={ratioText}
              onChangeText={setRatioText}
              keyboardType="decimal-pad"
              style={styles.textInput}
            />
          </View>
        </View>

        <View style={styles.ratioPillsRow}>
          {RATIO_PRESETS.map((r) => {
            const isRatioSelected = Math.abs(ratio - r) < 0.01;
            return (
              <Pressable
                key={r}
                onPress={() => setRatioText(String(r))}
                style={[styles.ratioPill, isRatioSelected ? styles.ratioPillActive : styles.ratioPillInactive]}
                accessibilityRole="button"
                accessibilityState={{ selected: isRatioSelected }}
                accessibilityLabel={`Select ratio 1 to ${r}`}
              >
                <Text style={[styles.ratioPillText, isRatioSelected ? styles.ratioPillTextActive : styles.ratioPillTextInactive]}>
                  1:{r}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.waterSummaryRow}>
          <Text style={styles.waterSummaryLabel}>TOTAL WATER TARGET</Text>
          <Text style={styles.waterSummaryValue}>{calculatedWater}g</Text>
        </View>
      </View>

      {/* Section 3: Parameters */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionHeader}>GRIND & TEMPERATURE</Text>

        <View style={styles.row}>
          <View style={styles.halfField}>
            <Text style={styles.fieldLabel}>GRIND SIZE</Text>
            <TextInput
              value={grindSize}
              onChangeText={setGrindSize}
              placeholder="e.g. Medium-Fine"
              placeholderTextColor={colors.textMuted}
              numberOfLines={1}
              style={styles.textInput}
            />
          </View>
          <View style={styles.halfField}>
            <Text style={styles.fieldLabel}>WATER TEMP (°C)</Text>
            <TextInput
              value={waterTempText}
              onChangeText={setWaterTempText}
              keyboardType="number-pad"
              numberOfLines={1}
              style={styles.textInput}
            />
          </View>
        </View>
      </View>

      {/* Section 4: Stages */}
      <View style={styles.sectionCard}>
        <View style={styles.stagesHeaderRow}>
          <Text style={styles.sectionHeader}>BREW STAGES</Text>
          <Text style={styles.timeSummaryText}>
            Total: {Math.floor(totalBrewTime / 60)}m {totalBrewTime % 60}s
          </Text>
        </View>

        {stages.map((st, idx) => (
          <View key={st.id || idx} style={styles.stageEditorCard}>
            <View style={styles.stageEditorHeader}>
              <Text style={styles.stageNumber}>Step {idx + 1} ({st.startSecond}s)</Text>
              <View style={styles.stageActionIcons}>
                <Pressable
                  onPress={() => handleMoveStage(idx, -1)}
                  disabled={idx === 0}
                  style={[styles.miniButton, idx === 0 && styles.miniButtonDisabled]}
                  accessibilityRole="button"
                  accessibilityLabel={`Move stage ${idx + 1} up`}
                >
                  <ChevronUp size={16} color={idx === 0 ? colors.textMuted : colors.textPrimary} />
                </Pressable>
                <Pressable
                  onPress={() => handleMoveStage(idx, 1)}
                  disabled={idx === stages.length - 1}
                  style={[styles.miniButton, idx === stages.length - 1 && styles.miniButtonDisabled]}
                  accessibilityRole="button"
                  accessibilityLabel={`Move stage ${idx + 1} down`}
                >
                  <ChevronDown size={16} color={idx === stages.length - 1 ? colors.textMuted : colors.textPrimary} />
                </Pressable>
                <Pressable
                  onPress={() => handleRemoveStage(idx)}
                  style={styles.miniButton}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove stage ${idx + 1}`}
                >
                  <Trash2 size={16} color={colors.statusError} />
                </Pressable>
              </View>
            </View>

            <TextInput
              value={st.name}
              onChangeText={(val) => handleUpdateStage(idx, { name: val })}
              placeholder="e.g. Bloom"
              placeholderTextColor={colors.textMuted}
              numberOfLines={1}
              style={styles.textInput}
            />

            <Text style={styles.fieldLabel}>STAGE TYPE</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.stageTypeRow}
            >
              {STAGE_TYPES.map((stType) => {
                const isTypeSelected = st.stageType === stType.value;
                return (
                  <Pressable
                    key={stType.value}
                    onPress={() => handleUpdateStage(idx, { stageType: stType.value })}
                    style={[
                      styles.stageTypePill,
                      isTypeSelected ? styles.stageTypePillActive : styles.stageTypePillInactive,
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isTypeSelected }}
                    accessibilityLabel={`Step ${idx + 1} stage type ${stType.label}`}
                  >
                    <Text
                      style={[
                        styles.stageTypePillText,
                        isTypeSelected ? styles.stageTypePillTextActive : styles.stageTypePillTextInactive,
                      ]}
                    >
                      {stType.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>DURATION (SEC)</Text>
                <TextInput
                  value={String(st.durationSeconds)}
                  onChangeText={(val) =>
                    handleUpdateStage(idx, { durationSeconds: parseInt(val, 10) || 0 })
                  }
                  keyboardType="number-pad"
                  numberOfLines={1}
                  style={styles.textInput}
                />
              </View>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>TARGET WATER (G)</Text>
                <TextInput
                  value={String(st.targetWaterWeightGrams)}
                  onChangeText={(val) =>
                    handleUpdateStage(idx, { targetWaterWeightGrams: parseFloat(val) || 0 })
                  }
                  keyboardType="decimal-pad"
                  numberOfLines={1}
                  style={styles.textInput}
                />
              </View>
            </View>

            <TextInput
              value={st.instruction}
              onChangeText={(val) => handleUpdateStage(idx, { instruction: val })}
              placeholder="Pour technique, notes..."
              placeholderTextColor={colors.textMuted}
              numberOfLines={1}
              style={styles.textInput}
            />
          </View>
        ))}

        <Pressable onPress={handleAddStage} style={styles.addStageButton} accessibilityRole="button" accessibilityLabel="Add Brew Stage">
          <Plus size={16} color={colors.accent} />
          <Text style={styles.addStageButtonText}>+ ADD STAGE</Text>
        </Pressable>
      </View>
    </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 48,
  },
  navHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  navButton: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontFamily: FONTS.sansBold,
    fontSize: 18,
    color: colors.textPrimary,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accent,
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  saveButtonText: {
    fontFamily: FONTS.monoBold,
    fontSize: 12,
    color: colors.canvas,
    letterSpacing: 0.8,
  },
  errorBanner: {
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.statusError,
    borderRadius: 8,
    padding: 12,
  },
  errorBannerText: {
    fontFamily: FONTS.sansRegular,
    fontSize: 13,
    color: colors.statusError,
  },
  sectionCard: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 8,
    padding: 16,
    gap: 10,
  },
  sectionHeader: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    color: colors.accent,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  stagesHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeSummaryText: {
    fontFamily: FONTS.sansBold,
    fontSize: 12,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  fieldLabel: {
    fontFamily: FONTS.monoBold,
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  textInput: {
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 6,
    minHeight: 44,
    paddingHorizontal: 12,
    color: colors.textPrimary,
    fontFamily: FONTS.sansRegular,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  multilineInput: {
    minHeight: 72,
    textAlignVertical: 'top',
    paddingVertical: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
    gap: 4,
  },
  methodRow: {
    gap: 8,
    paddingVertical: 4,
  },
  methodPill: {
    paddingHorizontal: 12,
    minHeight: 44,
    minWidth: 44,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodPillActive: {
    backgroundColor: colors.panelRecessed,
    borderColor: colors.accent,
  },
  methodPillInactive: {
    backgroundColor: colors.panelRecessed,
    borderColor: colors.borderSubtle,
  },
  methodPillText: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
  },
  methodPillTextActive: {
    color: colors.accent,
  },
  methodPillTextInactive: {
    color: colors.textMuted,
  },
  ratioPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  ratioPill: {
    paddingHorizontal: 10,
    minHeight: 44,
    minWidth: 44,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratioPillActive: {
    backgroundColor: colors.panelRecessed,
    borderColor: colors.accent,
  },
  ratioPillInactive: {
    backgroundColor: colors.panelRecessed,
    borderColor: colors.borderSubtle,
  },
  ratioPillText: {
    fontFamily: FONTS.sansBold,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  ratioPillTextActive: {
    color: colors.accent,
  },
  ratioPillTextInactive: {
    color: colors.textSecondary,
  },
  waterSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.panelRecessed,
    padding: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  waterSummaryLabel: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  waterSummaryValue: {
    fontFamily: FONTS.sansBold,
    fontSize: 15,
    color: colors.accent,
    fontVariant: ['tabular-nums'],
  },
  stageEditorCard: {
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  stageEditorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stageNumber: {
    fontFamily: FONTS.sansBold,
    fontSize: 11,
    color: colors.accent,
    fontVariant: ['tabular-nums'],
  },
  stageActionIcons: {
    flexDirection: 'row',
    gap: 4,
  },
  miniButton: {
    width: 44,
    height: 44,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniButtonDisabled: {
    opacity: 0.3,
  },
  stageTypeRow: {
    gap: 6,
    paddingVertical: 4,
  },
  stageTypePill: {
    paddingHorizontal: 10,
    minHeight: 44,
    minWidth: 44,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageTypePillActive: {
    backgroundColor: colors.panel,
    borderColor: colors.accent,
  },
  stageTypePillInactive: {
    backgroundColor: colors.panel,
    borderColor: colors.borderSubtle,
  },
  stageTypePillText: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
  },
  stageTypePillTextActive: {
    color: colors.accent,
  },
  stageTypePillTextInactive: {
    color: colors.textSecondary,
  },
  addStageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 6,
  },
  addStageButtonText: {
    fontFamily: FONTS.monoBold,
    fontSize: 12,
    color: colors.accent,
  },
});
