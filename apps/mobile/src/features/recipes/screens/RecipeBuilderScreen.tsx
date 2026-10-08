import React, { useState, useRef, useEffect, useContext, useMemo } from 'react';
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
  KeyboardAwareScrollView,
  KeyboardAwareScrollViewRef,
} from 'react-native-keyboard-controller';
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
  Equipment,
  RecipeGrinderSetting,
  GrinderSettingScale,
} from '@brewlog/core';
import { useRecipes } from '../RecipeContext';
import { EquipmentContext, useOptionalEquipment } from '../../equipment/EquipmentContext';
import { recalculateTiming, calculateTotalBrewTime } from '../utils/timingUtils';
import { FONTS } from '../../../theme/fonts';

const { colors } = INDUSTRIAL_PRECISION_THEME;

const SCALE_TYPE_OPTIONS: { label: string; value: GrinderSettingScale }[] = [
  { label: 'Stepped Numbers', value: 'stepped-numbers' },
  { label: 'Clicks', value: 'clicks' },
  { label: 'Stepless', value: 'stepless' },
  { label: 'Microns', value: 'microns' },
];

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
  const equipmentContext = useOptionalEquipment?.() ?? useContext(EquipmentContext);
  const contextGrinders = equipmentContext?.grinders || [];
  const addEquipment = equipmentContext?.addEquipment;

  const [locallyAddedGrinders, setLocallyAddedGrinders] = useState<Equipment[]>([]);

  const availableGrinders = React.useMemo(() => {
    return [
      ...contextGrinders,
      ...locallyAddedGrinders.filter((lg) => !contextGrinders.some((cg) => cg.id === lg.id)),
    ];
  }, [contextGrinders, locallyAddedGrinders]);

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

  const [grinderSettings, setGrinderSettings] = useState<RecipeGrinderSetting[]>(() => {
    if (sourceRecipe?.grinderSettings && sourceRecipe.grinderSettings.length > 0) {
      return sourceRecipe.grinderSettings.filter((gs) =>
        contextGrinders.some((g) => g.id === gs.grinderId)
      );
    }
    if (
      sourceRecipe?.recommendedGrinderId &&
      contextGrinders.some((g) => g.id === sourceRecipe.recommendedGrinderId)
    ) {
      return [
        {
          grinderId: sourceRecipe.recommendedGrinderId,
          setting: sourceRecipe.grindSize || '',
        },
      ];
    }
    return [];
  });

  const [isAddingInlineGrinder, setIsAddingInlineGrinder] = useState<boolean>(false);
  const [inlineBrand, setInlineBrand] = useState<string>('');
  const [inlineModel, setInlineModel] = useState<string>('');
  const [inlineScale, setInlineScale] = useState<GrinderSettingScale>('stepped-numbers');
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [isCreatingGrinder, setIsCreatingGrinder] = useState<boolean>(false);
  const [activePickerRowIndex, setActivePickerRowIndex] = useState<number | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const initialValues = useMemo(
    () => ({
      name: sourceRecipe
        ? duplicateId
          ? `${sourceRecipe.name} (Copy)`
          : sourceRecipe.name
        : '',
      author: sourceRecipe?.author || '',
      brewMethod: sourceRecipe?.brewMethod || matchedMethod || 'v60',
      doseText: sourceRecipe
        ? String(sourceRecipe.coffeeDoseGrams)
        : initialDose
        ? String(initialDose)
        : '15',
      ratioText: sourceRecipe
        ? String(sourceRecipe.ratio)
        : computedRatio
        ? String(computedRatio)
        : '16.67',
      grindSize: sourceRecipe?.grindSize || 'Medium-Fine',
      waterTempText: sourceRecipe ? String(sourceRecipe.waterTempCelsius) : '93',
      description: sourceRecipe?.description || '',
      notes: sourceRecipe?.notes || '',
      stagesJson: JSON.stringify(
        sourceRecipe
          ? recalculateTiming(sourceRecipe.stages)
          : parsedParamStages || DEFAULT_STAGES
      ),
      grinderSettingsJson: JSON.stringify(
        (() => {
          if (sourceRecipe?.grinderSettings && sourceRecipe.grinderSettings.length > 0) {
            return sourceRecipe.grinderSettings.filter((gs) =>
              contextGrinders.some((g) => g.id === gs.grinderId)
            );
          }
          if (
            sourceRecipe?.recommendedGrinderId &&
            contextGrinders.some((g) => g.id === sourceRecipe.recommendedGrinderId)
          ) {
            return [
              {
                grinderId: sourceRecipe.recommendedGrinderId,
                setting: sourceRecipe.grindSize || '',
              },
            ];
          }
          return [];
        })()
      ),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sourceRecipe?.id, duplicateId]
  );

  const isDirty =
    name !== initialValues.name ||
    author !== initialValues.author ||
    brewMethod !== initialValues.brewMethod ||
    doseText !== initialValues.doseText ||
    ratioText !== initialValues.ratioText ||
    grindSize !== initialValues.grindSize ||
    waterTempText !== initialValues.waterTempText ||
    description !== initialValues.description ||
    notes !== initialValues.notes ||
    JSON.stringify(stages) !== initialValues.stagesJson ||
    JSON.stringify(grinderSettings) !== initialValues.grinderSettingsJson ||
    isAddingInlineGrinder ||
    inlineBrand.trim() !== '' ||
    inlineModel.trim() !== '';

  const coffeeDoseGrams = parseFloat(doseText) || 0;
  const ratio = parseFloat(ratioText) || 0;
  const waterTempCelsius = parseInt(waterTempText, 10) || 0;

  const calculatedWater = calculateWaterAmount(coffeeDoseGrams, ratio);
  const totalBrewTime = calculateTotalBrewTime(stages);

  const scrollViewRef = useRef<KeyboardAwareScrollViewRef>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

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
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      scrollViewRef.current?.scrollToEnd?.({ animated: true });
    }, 100);
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

  const handleSaveInlineGrinder = async () => {
    const trimmedBrand = inlineBrand.trim();
    const trimmedModel = inlineModel.trim();
    if (!trimmedBrand || !trimmedModel) {
      setInlineError('Please enter both brand and model for the grinder.');
      return;
    }
    setInlineError(null);
    setIsCreatingGrinder(true);
    try {
      let created: Equipment | undefined;
      if (addEquipment) {
        created = await addEquipment({
          type: 'grinder',
          brand: trimmedBrand,
          model: trimmedModel,
          settingScaleType: inlineScale,
        });
      }
      const newGrinder: Equipment = created || {
        id: `grinder-${Date.now()}`,
        type: 'grinder',
        brand: trimmedBrand,
        model: trimmedModel,
        settingScaleType: inlineScale,
        createdAt: new Date().toISOString(),
      };
      setLocallyAddedGrinders((prev) => [...prev, newGrinder]);
      setGrinderSettings([{ grinderId: newGrinder.id, setting: '' }]);
      setIsAddingInlineGrinder(false);
      setInlineBrand('');
      setInlineModel('');
      setInlineScale('stepped-numbers');
    } catch (err: any) {
      setInlineError(err?.message || 'Failed to add grinder.');
    } finally {
      setIsCreatingGrinder(false);
    }
  };

  const handleAddGrinderSetting = () => {
    if (availableGrinders.length === 0) return;
    const unselected = availableGrinders.find(
      (g) => !grinderSettings.some((gs) => gs.grinderId === g.id)
    );
    if (!unselected) return;
    setGrinderSettings((prev) => [
      ...prev,
      { grinderId: unselected.id, setting: '' },
    ]);
  };

  const handleUpdateGrinderSetting = (
    index: number,
    field: keyof RecipeGrinderSetting,
    value: string
  ) => {
    setGrinderSettings((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return updated;
    });
  };

  const handleRemoveGrinderSetting = (index: number) => {
    setGrinderSettings((prev) => prev.filter((_, i) => i !== index));
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
      grinderSettings,
      recommendedGrinderId: grinderSettings[0]?.grinderId || undefined,
    };

    try {
      if (editId) {
        await updateRecipe(editId, payload);
        dismissModal();
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

  const dismissModal = () => {
    if (router.canGoBack?.()) {
      router.back();
    } else {
      router.replace('/(tabs)/recipes');
    }
  };

  const handleCancel = () => {
    if (isDirty) {
      Alert.alert(
        'Discard Changes?',
        'Any unsaved recipe customizations will be lost.',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: dismissModal },
        ]
      );
    } else {
      dismissModal();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Pinned Navigation Header */}
      <View style={styles.headerContainer}>
        <View style={styles.dragHandleContainer}>
          <View style={styles.dragHandle} />
        </View>
        <View style={styles.navHeader}>
          <Pressable
            onPress={handleCancel}
            style={styles.navButton}
            accessibilityRole="button"
            accessibilityLabel="Cancel editing"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Check size={16} color={colors.canvas} />
            <Text style={styles.saveButtonText}>SAVE</Text>
          </Pressable>
        </View>
      </View>

      <KeyboardAwareScrollView
        ref={scrollViewRef}
        style={styles.container}
        contentContainerStyle={styles.content}
        bottomOffset={32}
        keyboardShouldPersistTaps="handled"
      >

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

      {/* Section 4: Grinder Settings */}
      <View style={styles.sectionCard}>
        <View style={styles.grinderHeaderRow}>
          <Text style={styles.sectionHeader}>GRINDER SETTINGS</Text>
          {availableGrinders.length > 0 &&
            grinderSettings.length < availableGrinders.length && (
              <Pressable
                onPress={handleAddGrinderSetting}
                style={styles.addGrinderSettingButton}
                accessibilityRole="button"
                accessibilityLabel="Add Grinder Setting"
              >
                <Plus size={14} color={colors.accent} />
                <Text style={styles.addGrinderSettingButtonText}>ADD</Text>
              </Pressable>
            )}
        </View>

        {/* Case A: availableGrinders.length === 0 */}
        {availableGrinders.length === 0 && (
          <View style={styles.emptyGrindersCard}>
            <Text style={styles.emptyGrindersText}>
              No grinders added to equipment yet.
            </Text>
            {!isAddingInlineGrinder ? (
              <Pressable
                onPress={() => setIsAddingInlineGrinder(true)}
                style={styles.inlineAddTriggerButton}
                accessibilityRole="button"
                accessibilityLabel="Add Grinder"
              >
                <Plus size={14} color={colors.accent} />
                <Text style={styles.inlineAddTriggerButtonText}>ADD GRINDER</Text>
              </Pressable>
            ) : (
              <View style={styles.inlineGrinderForm}>
                {inlineError ? (
                  <View style={styles.inlineErrorBanner}>
                    <Text style={styles.inlineErrorText}>{inlineError}</Text>
                  </View>
                ) : null}

                <Text style={styles.fieldLabel}>GRINDER BRAND *</Text>
                <TextInput
                  value={inlineBrand}
                  onChangeText={setInlineBrand}
                  placeholder="e.g. Fellow, Comandante"
                  placeholderTextColor={colors.textMuted}
                  accessibilityLabel="Grinder Brand"
                  style={styles.textInput}
                />

                <Text style={styles.fieldLabel}>GRINDER MODEL *</Text>
                <TextInput
                  value={inlineModel}
                  onChangeText={setInlineModel}
                  placeholder="e.g. Ode Gen 2, C40 MK4"
                  placeholderTextColor={colors.textMuted}
                  accessibilityLabel="Grinder Model"
                  style={styles.textInput}
                />

                <Text style={styles.fieldLabel}>DIAL SETTING FORMAT</Text>
                <View style={styles.scaleTypeRow}>
                  {SCALE_TYPE_OPTIONS.map((opt) => {
                    const isSelected = inlineScale === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => setInlineScale(opt.value)}
                        style={[
                          styles.scaleTypePill,
                          isSelected
                            ? styles.scaleTypePillActive
                            : styles.scaleTypePillInactive,
                        ]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                        accessibilityLabel={`Format ${opt.label}`}
                      >
                        <Text
                          style={[
                            styles.scaleTypePillText,
                            isSelected
                              ? styles.scaleTypePillTextActive
                              : styles.scaleTypePillTextInactive,
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.inlineFormButtonsRow}>
                  <Pressable
                    onPress={() => {
                      setIsAddingInlineGrinder(false);
                      setInlineError(null);
                    }}
                    style={styles.inlineCancelButton}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel adding grinder"
                  >
                    <Text style={styles.inlineCancelButtonText}>Cancel</Text>
                  </Pressable>

                  <Pressable
                    onPress={handleSaveInlineGrinder}
                    disabled={isCreatingGrinder}
                    style={styles.inlineSaveButton}
                    accessibilityRole="button"
                    accessibilityLabel="Save Grinder"
                  >
                    <Text style={styles.inlineSaveButtonText}>
                      {isCreatingGrinder ? 'Saving...' : 'Save Grinder'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Case B: availableGrinders.length > 0 */}
        {availableGrinders.length > 0 && (
          <View style={styles.grinderSettingsList}>
            {grinderSettings.length === 0 ? (
              <View style={styles.emptyGrinderSettingsRow}>
                <Text style={styles.emptyGrinderSettingsText}>
                  No grinder settings configured for this recipe.
                </Text>
              </View>
            ) : (
              grinderSettings.map((row, idx) => {
                const currentGrinder = availableGrinders.find((g) => g.id === row.grinderId);
                const grinderName = currentGrinder
                  ? `${currentGrinder.brand} ${currentGrinder.model}`
                  : 'Select Grinder';

                return (
                  <View key={`grinder-setting-${idx}`} style={styles.grinderSettingCard}>
                    <View style={styles.grinderSettingTopRow}>
                      <View style={styles.grinderBadgeContainer}>
                        {idx === 0 && (
                          <View style={styles.primaryBadge}>
                            <Text style={styles.primaryBadgeText}>PRIMARY</Text>
                          </View>
                        )}
                        <Text style={styles.grinderIndexText}>#{idx + 1}</Text>
                      </View>

                      <Pressable
                        onPress={() => handleRemoveGrinderSetting(idx)}
                        style={styles.removeGrinderButton}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove grinder ${idx + 1}`}
                      >
                        <Trash2 size={16} color={colors.statusError} />
                      </Pressable>
                    </View>

                    {/* Grinder Picker Trigger */}
                    <View style={styles.grinderPickerTriggerContainer}>
                      <Text style={styles.fieldLabel}>GRINDER</Text>
                      <Pressable
                        onPress={() => setActivePickerRowIndex(idx)}
                        style={styles.grinderPickerTrigger}
                        accessibilityRole="button"
                        accessibilityLabel={`Grinder ${idx + 1}`}
                      >
                        <Text style={styles.grinderPickerTriggerText}>{grinderName}</Text>
                        <ChevronDown size={14} color={colors.textSecondary} />
                      </Pressable>
                    </View>

                    {/* Setting Input */}
                    <View style={styles.grinderSettingInputContainer}>
                      <Text style={styles.fieldLabel}>DIAL SETTING</Text>
                      <TextInput
                        value={row.setting}
                        onChangeText={(val) =>
                          handleUpdateGrinderSetting(idx, 'setting', val)
                        }
                        placeholder="e.g. 5.1, 24 clicks..."
                        placeholderTextColor={colors.textMuted}
                        accessibilityLabel={`Setting for Grinder ${idx + 1}`}
                        numberOfLines={1}
                        style={styles.textInput}
                      />
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}
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
          <Text style={styles.addStageButtonText}>ADD STAGE</Text>
        </Pressable>
      </View>
    </KeyboardAwareScrollView>

    {/* Picker Modal Overlay */}
    {activePickerRowIndex !== null && (
      <View style={styles.pickerOverlay}>
        <View style={styles.pickerCard}>
          <Text style={styles.pickerTitle}>SELECT GRINDER</Text>
          <ScrollView
            style={styles.pickerScrollView}
            contentContainerStyle={styles.pickerScrollViewContent}
            nestedScrollEnabled
            showsVerticalScrollIndicator
          >
            {availableGrinders.map((g) => {
              const isSelectedInOtherRow = grinderSettings.some(
                (gs, i) => i !== activePickerRowIndex && gs.grinderId === g.id
              );
              const isCurrent =
                grinderSettings[activePickerRowIndex]?.grinderId === g.id;

              return (
                <Pressable
                  key={g.id}
                  disabled={isSelectedInOtherRow}
                  onPress={() => {
                    handleUpdateGrinderSetting(activePickerRowIndex, 'grinderId', g.id);
                    setActivePickerRowIndex(null);
                  }}
                  style={[
                    styles.pickerOption,
                    isCurrent && styles.pickerOptionCurrent,
                    isSelectedInOtherRow && styles.pickerOptionDisabled,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${g.brand} ${g.model}`}
                >
                  <Text
                    style={[
                      styles.pickerOptionText,
                      isCurrent && styles.pickerOptionTextCurrent,
                      isSelectedInOtherRow && styles.pickerOptionTextDisabled,
                    ]}
                  >
                    {g.brand} {g.model}
                    {g.settingScaleType ? ` (${g.settingScaleType})` : ''}
                    {isSelectedInOtherRow ? ' (Already added)' : ''}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Pressable
            onPress={() => setActivePickerRowIndex(null)}
            style={styles.pickerCancelButton}
            accessibilityRole="button"
            accessibilityLabel="Cancel grinder selection"
          >
            <Text style={styles.pickerCancelText}>CANCEL</Text>
          </Pressable>
        </View>
      </View>
    )}
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
  headerContainer: {
    backgroundColor: colors.canvas,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderSubtle,
  },
  navHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  navButton: {
    minHeight: 40,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontFamily: FONTS.displayMedium,
    fontSize: 17,
    color: colors.textPrimary,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accent,
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  saveButtonText: {
    fontFamily: FONTS.monoBold,
    fontSize: 12,
    color: colors.canvas,
    letterSpacing: 1,
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
  grinderHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  grinderHeaderTitleContainer: {
    flex: 1,
  },
  sectionSubtitle: {
    fontFamily: FONTS.sansRegular,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: -2,
    marginBottom: 4,
  },
  addGrinderSettingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    minHeight: 36,
  },
  addGrinderSettingButtonText: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    color: colors.accent,
  },
  emptyGrindersCard: {
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 8,
    padding: 14,
    gap: 12,
  },
  emptyGrindersText: {
    fontFamily: FONTS.sansRegular,
    fontSize: 13,
    color: colors.textSecondary,
  },
  inlineAddTriggerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    minHeight: 36,
  },
  inlineAddTriggerButtonText: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    color: colors.accent,
  },
  inlineGrinderForm: {
    gap: 10,
    paddingTop: 4,
  },
  inlineErrorBanner: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.statusError,
    borderRadius: 6,
    padding: 8,
  },
  inlineErrorText: {
    fontFamily: FONTS.sansRegular,
    fontSize: 12,
    color: colors.statusError,
  },
  scaleTypeRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  scaleTypePill: {
    minHeight: 36,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleTypePillActive: {
    backgroundColor: colors.panelRecessed,
    borderColor: colors.accent,
  },
  scaleTypePillInactive: {
    backgroundColor: colors.panel,
    borderColor: colors.borderSubtle,
  },
  scaleTypePillText: {
    fontFamily: FONTS.monoRegular,
    fontSize: 11,
    color: colors.textSecondary,
  },
  scaleTypePillTextActive: {
    fontFamily: FONTS.monoBold,
    color: colors.accent,
  },
  scaleTypePillTextInactive: {
    color: colors.textSecondary,
  },
  inlineFormButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  inlineCancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: colors.panel,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineCancelButtonText: {
    fontFamily: FONTS.monoRegular,
    fontSize: 11,
    color: colors.textSecondary,
  },
  inlineSaveButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: colors.accent,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineSaveButtonText: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    color: colors.canvas,
  },
  grinderSettingsList: {
    gap: 12,
  },
  emptyGrinderSettingsRow: {
    padding: 12,
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 6,
  },
  emptyGrinderSettingsText: {
    fontFamily: FONTS.sansRegular,
    fontSize: 13,
    color: colors.textSecondary,
  },
  grinderSettingCard: {
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 8,
    padding: 12,
    gap: 10,
  },
  grinderSettingTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  grinderBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryBadge: {
    backgroundColor: 'rgba(212, 163, 89, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(212, 163, 89, 0.4)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  primaryBadgeText: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    color: colors.accent,
    letterSpacing: 0.8,
  },
  grinderIndexText: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    color: colors.textMuted,
  },
  removeGrinderButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grinderPickerTriggerContainer: {
    gap: 4,
  },
  grinderPickerTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 6,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  grinderPickerTriggerText: {
    fontFamily: FONTS.sansMedium,
    fontSize: 13,
    color: colors.textPrimary,
  },
  grinderSettingInputContainer: {
    gap: 4,
  },
  pickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 1000,
  },
  pickerCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  pickerTitle: {
    fontFamily: FONTS.monoBold,
    fontSize: 12,
    color: colors.accent,
    letterSpacing: 1,
    marginBottom: 4,
  },
  pickerScrollView: {
    maxHeight: 300,
  },
  pickerScrollViewContent: {
    gap: 10,
  },
  pickerOption: {
    minHeight: 44,
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderRadius: 6,
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  pickerOptionCurrent: {
    borderColor: colors.accent,
  },
  pickerOptionDisabled: {
    opacity: 0.4,
  },
  pickerOptionText: {
    fontFamily: FONTS.sansRegular,
    fontSize: 13,
    color: colors.textPrimary,
  },
  pickerOptionTextCurrent: {
    fontFamily: FONTS.sansBold,
    color: colors.accent,
  },
  pickerOptionTextDisabled: {
    color: colors.textMuted,
  },
  pickerCancelButton: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    backgroundColor: colors.panelRecessed,
    marginTop: 6,
  },
  pickerCancelText: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    color: colors.textSecondary,
  },
});
