import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { X, Check, Star, Trash2 } from 'lucide-react-native';
import {
  TastingLog,
  BrewMethodType,
  CuppingAttributes,
  calculateScaScore,
  INDUSTRIAL_PRECISION_THEME,
} from '@brewlog/core';
import { FONTS } from '../../../theme/fonts';
import { useReviews } from '../ReviewsContext';
import { useStash } from '../../stash/StashContext';
import { useEquipment } from '../../equipment/EquipmentContext';
import { FlavorTagSelector } from '../components/FlavorTagSelector';
import { ScaAttributeScoring, BASELINE_SCORES } from '../components/ScaAttributeScoring';

const { colors } = INDUSTRIAL_PRECISION_THEME;

const BREW_METHODS: { id: BrewMethodType; label: string }[] = [
  { id: 'v60', label: 'V60' },
  { id: 'espresso', label: 'Espresso' },
  { id: 'aeropress', label: 'AeroPress' },
  { id: 'french-press', label: 'French Press' },
  { id: 'chemex', label: 'Chemex' },
  { id: 'custom', label: 'Tasting Bowl / Other' },
  { id: 'cold-brew', label: 'Cold Brew' },
];

interface ReviewModalFormProps {
  id?: string;
  sourceItem?: TastingLog;
  initialParams?: Record<string, string | undefined>;
}

const ReviewModalForm: React.FC<ReviewModalFormProps> = ({
  id,
  sourceItem,
  initialParams = {},
}) => {
  const router = useRouter();
  const { addReview, updateReview, deleteReview, setPendingBrewSession } = useReviews();
  const { beans } = useStash();
  const { grinders, brewers } = useEquipment();

  const isEditMode = Boolean(sourceItem);
  const isFromTimer = initialParams.fromTimer === 'true';

  // Find matching initial bean from params or source
  const initialBeanId = sourceItem?.beanId || initialParams.beanId;
  const initialBean = initialBeanId ? beans.find((b) => b.id === initialBeanId) : undefined;

  // Form states
  const [coffeeName, setCoffeeName] = useState<string>(
    sourceItem?.beanNameSnapshot || initialBean?.name || ''
  );
  const [roaster, setRoaster] = useState<string>(
    sourceItem?.roasterSnapshot || initialBean?.roaster || ''
  );
  const [selectedBeanId, setSelectedBeanId] = useState<string | undefined>(
    initialBeanId && initialBeanId !== 'sample' ? initialBeanId : undefined
  );
  const [brewMethod, setBrewMethod] = useState<BrewMethodType>(
    sourceItem?.brewMethod || (initialParams.brewMethod as BrewMethodType) || 'v60'
  );
  const [grinderId, setGrinderId] = useState<string | undefined>(
    sourceItem?.grinderId || initialParams.grinderId
  );
  const [grindSetting, setGrindSetting] = useState<string>(
    sourceItem?.grindSetting || initialParams.grind || ''
  );
  const [brewerId, setBrewerId] = useState<string | undefined>(
    sourceItem?.brewerId || initialParams.brewerId
  );
  const [dose, setDose] = useState<string>(
    sourceItem ? String(sourceItem.coffeeDoseGrams) : initialParams.dose || '18'
  );
  const [water, setWater] = useState<string>(
    sourceItem ? String(sourceItem.waterAmountGrams) : initialParams.water || '300'
  );
  const [actualTime, setActualTime] = useState<string>(
    sourceItem?.actualTimeSeconds ? String(sourceItem.actualTimeSeconds) : initialParams.actualTime || '210'
  );
  const [waterTemp, setWaterTemp] = useState<string>(
    sourceItem?.waterTempCelsius ? String(sourceItem.waterTempCelsius) : initialParams.temp || '94'
  );
  const [scores, setScores] = useState<CuppingAttributes>(
    sourceItem?.scores || BASELINE_SCORES
  );
  const [flavorTags, setFlavorTags] = useState<string[]>(
    sourceItem?.flavorTags || []
  );
  const [notes, setNotes] = useState<string>(
    sourceItem?.notes || initialParams.notes || ''
  );
  const [rating, setRating] = useState<number>(
    sourceItem?.rating ?? 5
  );
  const [wouldBrewAgain, setWouldBrewAgain] = useState<boolean>(
    sourceItem?.wouldBrewAgain ?? true
  );
  const [showTimerBanner, setShowTimerBanner] = useState<boolean>(isFromTimer);

  // Initial values snapshot for dirty check
  const initialValues = useMemo(
    () => ({
      coffeeName: sourceItem?.beanNameSnapshot || initialBean?.name || '',
      roaster: sourceItem?.roasterSnapshot || initialBean?.roaster || '',
      brewMethod: sourceItem?.brewMethod || (initialParams.brewMethod as BrewMethodType) || 'v60',
      grindSetting: sourceItem?.grindSetting || initialParams.grind || '',
      dose: sourceItem ? String(sourceItem.coffeeDoseGrams) : initialParams.dose || '18',
      water: sourceItem ? String(sourceItem.waterAmountGrams) : initialParams.water || '300',
      actualTime: sourceItem?.actualTimeSeconds ? String(sourceItem.actualTimeSeconds) : initialParams.actualTime || '210',
      waterTemp: sourceItem?.waterTempCelsius ? String(sourceItem.waterTempCelsius) : initialParams.temp || '94',
      notes: sourceItem?.notes || initialParams.notes || '',
      rating: sourceItem?.rating ?? 5,
      wouldBrewAgain: sourceItem?.wouldBrewAgain ?? true,
    }),
    [sourceItem, initialBean, initialParams]
  );

  const isDirty =
    coffeeName !== initialValues.coffeeName ||
    roaster !== initialValues.roaster ||
    brewMethod !== initialValues.brewMethod ||
    grindSetting !== initialValues.grindSetting ||
    dose !== initialValues.dose ||
    water !== initialValues.water ||
    actualTime !== initialValues.actualTime ||
    waterTemp !== initialValues.waterTemp ||
    notes !== initialValues.notes ||
    rating !== initialValues.rating ||
    wouldBrewAgain !== initialValues.wouldBrewAgain ||
    flavorTags.length !== (sourceItem?.flavorTags?.length ?? 0);

  const handleToggleTag = useCallback((tag: string) => {
    setFlavorTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  const handleSelectBean = (bean: (typeof beans)[0]) => {
    setSelectedBeanId(bean.id);
    setCoffeeName(bean.name);
    setRoaster(bean.roaster);
  };

  const dismissModal = () => {
    if (router.canGoBack?.()) {
      router.back();
    } else {
      router.replace('/(tabs)/reviews');
    }
  };

  const handleClose = () => {
    if (isDirty) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved review changes that will be lost.',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: dismissModal },
        ]
      );
    } else {
      dismissModal();
    }
  };

  const handleSave = async () => {
    const trimmedCoffee = coffeeName.trim();
    const trimmedRoaster = roaster.trim();

    if (!trimmedCoffee) {
      Alert.alert('Missing Field', 'Please enter a coffee name.');
      return;
    }
    if (!trimmedRoaster) {
      Alert.alert('Missing Field', 'Please enter a roaster.');
      return;
    }

    const grinderObj = grinders.find((g) => g.id === grinderId);
    const brewerObj = brewers.find((b) => b.id === brewerId);

    const grinderSnapshot = grinderObj
      ? `${grinderObj.brand} ${grinderObj.model}`
      : undefined;
    const brewerSnapshot = brewerObj
      ? `${brewerObj.brand} ${brewerObj.model}`
      : undefined;

    const calculatedSca = calculateScaScore(scores);

    if (isEditMode && sourceItem) {
      await updateReview(sourceItem.id, {
        beanNameSnapshot: trimmedCoffee,
        roasterSnapshot: trimmedRoaster,
        beanId:
          selectedBeanId && selectedBeanId !== 'sample'
            ? selectedBeanId
            : sourceItem.beanId !== 'sample'
            ? sourceItem.beanId
            : undefined,
        recipeId: sourceItem.recipeId !== 'sample' ? sourceItem.recipeId : undefined,
        brewMethod,
        grinderId,
        brewerId,
        grinderSnapshot: grinderSnapshot || sourceItem.grinderSnapshot,
        brewerSnapshot: brewerSnapshot || sourceItem.brewerSnapshot,
        grindSetting: grindSetting.trim() || sourceItem.grindSetting || '',
        coffeeDoseGrams: Number(dose) || sourceItem.coffeeDoseGrams,
        waterAmountGrams: Number(water) || sourceItem.waterAmountGrams,
        actualTimeSeconds: Number(actualTime) || sourceItem.actualTimeSeconds,
        waterTempCelsius: Number(waterTemp) || sourceItem.waterTempCelsius,
        scores,
        calculatedScaScore: calculatedSca,
        flavorTags,
        notes: notes.trim(),
        rating,
        wouldBrewAgain,
      });
    } else {
      await addReview({
        beanNameSnapshot: trimmedCoffee,
        roasterSnapshot: trimmedRoaster,
        recipeNameSnapshot: initialParams.recipeName || 'Free Brew',
        beanId: selectedBeanId && selectedBeanId !== 'sample' ? selectedBeanId : undefined,
        recipeId:
          initialParams.recipeId && initialParams.recipeId !== 'sample'
            ? initialParams.recipeId
            : undefined,
        brewMethod,
        brewDate: new Date().toISOString(),
        grinderId,
        brewerId,
        grinderSnapshot,
        brewerSnapshot,
        grindSetting: grindSetting.trim() || '',
        coffeeDoseGrams: Number(dose) || 18,
        waterAmountGrams: Number(water) || 300,
        actualTimeSeconds: Number(actualTime) || 210,
        waterTempCelsius: Number(waterTemp) || 94,
        scores,
        calculatedScaScore: calculatedSca,
        flavorTags,
        notes: notes.trim(),
        rating,
        wouldBrewAgain,
      });
      setPendingBrewSession(null);
    }

    dismissModal();
  };

  const handleDelete = () => {
    if (!sourceItem) return;
    Alert.alert(
      'Delete Review?',
      'This action cannot be undone. Are you sure you want to delete this review?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteReview(sourceItem.id);
            dismissModal();
          },
        },
      ]
    );
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
            style={styles.navButton}
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="Close modal"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={20} color={colors.textSecondary} />
          </Pressable>

          <Text style={styles.navTitle}>
            {isEditMode ? 'Edit Review' : 'Add Review'}
          </Text>

          <Pressable
            style={styles.saveButton}
            onPress={handleSave}
            accessibilityRole="button"
            accessibilityLabel="Save review"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Check size={16} color={colors.canvas} />
            <Text style={styles.saveButtonText}>SAVE</Text>
          </Pressable>
        </View>
      </View>

      <KeyboardAwareScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        bottomOffset={32}
      >
        {/* Timer Prefill Banner */}
        {showTimerBanner && (
          <View style={styles.timerBanner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.timerBannerTitle}>
                Brew session prefilled from timer
              </Text>
              <Text style={styles.timerBannerSubtitle}>
                Dose, water, grind, and equipment were captured from your brew session.
              </Text>
            </View>
            <Pressable
              style={styles.timerBannerClear}
              onPress={() => setShowTimerBanner(false)}
              accessibilityRole="button"
              accessibilityLabel="Dismiss timer prefill banner"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.timerBannerClearText}>DISMISS</Text>
            </Pressable>
          </View>
        )}

        {/* Section 1: Coffee & Roaster */}
        <View style={styles.sectionChassis}>
          <Text style={styles.sectionEyebrow}>COFFEE & ROASTER</Text>

          {beans.length > 0 && !isEditMode && (
            <View style={styles.stashPickerContainer}>
              <Text style={styles.subLabel}>SELECT FROM STASH</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalChips}>
                {beans.map((b) => {
                  const isSelected = selectedBeanId === b.id;
                  return (
                    <Pressable
                      key={`stash-bean-${b.id}`}
                      style={[styles.beanChip, isSelected && styles.beanChipSelected]}
                      onPress={() => handleSelectBean(b)}
                      accessibilityRole="button"
                      accessibilityLabel={`Select bean ${b.name}`}
                      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                    >
                      <Text style={[styles.beanChipText, isSelected && styles.beanChipTextSelected]}>
                        {b.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>COFFEE NAME *</Text>
            <TextInput
              style={styles.input}
              value={coffeeName}
              onChangeText={setCoffeeName}
              placeholder="Coffee Name (e.g. Worka Sakaro)"
              placeholderTextColor={colors.textMuted}
              accessibilityLabel="Coffee Name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>ROASTER *</Text>
            <TextInput
              style={styles.input}
              value={roaster}
              onChangeText={setRoaster}
              placeholder="Roaster (e.g. Sey Coffee)"
              placeholderTextColor={colors.textMuted}
              accessibilityLabel="Roaster"
            />
          </View>
        </View>

        {/* Section 2: Equipment & Parameters */}
        <View style={styles.sectionChassis}>
          <Text style={styles.sectionEyebrow}>EQUIPMENT & BREW PARAMETERS</Text>

          {/* Brew Method */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>BREW METHOD</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalChips}>
              {BREW_METHODS.map((m) => {
                const isActive = brewMethod === m.id;
                return (
                  <Pressable
                    key={`modal-method-${m.id}`}
                    style={[styles.chip, isActive && styles.chipActive]}
                    onPress={() => setBrewMethod(m.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Select method ${m.label}`}
                    hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                  >
                    <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                      {m.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Grinder Selection */}
          {grinders.length > 0 && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>GRINDER</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalChips}>
                {grinders.map((g) => {
                  const isActive = grinderId === g.id;
                  return (
                    <Pressable
                      key={`modal-grinder-${g.id}`}
                      style={[styles.chip, isActive && styles.chipActive]}
                      onPress={() => setGrinderId(isActive ? undefined : g.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Select grinder ${g.brand} ${g.model}`}
                      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                    >
                      <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                        {g.brand} {g.model}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Grind Setting */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>GRIND SETTING</Text>
            <TextInput
              style={styles.input}
              value={grindSetting}
              onChangeText={setGrindSetting}
              placeholder="e.g. 18 clicks, 4.1, Medium-Fine"
              placeholderTextColor={colors.textMuted}
              accessibilityLabel="Grind Setting"
            />
          </View>

          {/* Brewer Selection */}
          {brewers.length > 0 && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>BREWER</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalChips}>
                {brewers.map((b) => {
                  const isActive = brewerId === b.id;
                  return (
                    <Pressable
                      key={`modal-brewer-${b.id}`}
                      style={[styles.chip, isActive && styles.chipActive]}
                      onPress={() => setBrewerId(isActive ? undefined : b.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Select brewer ${b.brand} ${b.model}`}
                      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                    >
                      <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                        {b.brand} {b.model}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Specs Quad Grid */}
          <View style={styles.specsGrid}>
            <View style={styles.specGridItem}>
              <Text style={styles.inputLabel}>DOSE (G)</Text>
              <TextInput
                style={styles.input}
                value={dose}
                onChangeText={setDose}
                keyboardType="numeric"
                accessibilityLabel="Dose"
              />
            </View>
            <View style={styles.specGridItem}>
              <Text style={styles.inputLabel}>WATER (G)</Text>
              <TextInput
                style={styles.input}
                value={water}
                onChangeText={setWater}
                keyboardType="numeric"
                accessibilityLabel="Water"
              />
            </View>
            <View style={styles.specGridItem}>
              <Text style={styles.inputLabel}>TIME (S)</Text>
              <TextInput
                style={styles.input}
                value={actualTime}
                onChangeText={setActualTime}
                keyboardType="numeric"
                accessibilityLabel="Actual Time"
              />
            </View>
            <View style={styles.specGridItem}>
              <Text style={styles.inputLabel}>TEMP (°C)</Text>
              <TextInput
                style={styles.input}
                value={waterTemp}
                onChangeText={setWaterTemp}
                keyboardType="numeric"
                accessibilityLabel="Water Temperature"
              />
            </View>
          </View>
        </View>

        {/* Section 3: Flavor Notes Selector */}
        <View style={styles.sectionChassis}>
          <Text style={styles.sectionEyebrow}>FLAVOR DESCRIPTORS</Text>
          <FlavorTagSelector
            selectedTags={flavorTags}
            onToggleTag={handleToggleTag}
          />
        </View>

        {/* Section 4: SCA Sensory Scoring */}
        <View style={styles.sectionChassis}>
          <Text style={styles.sectionEyebrow}>SCA SENSORY PROTOCOL</Text>
          <ScaAttributeScoring
            scores={scores}
            onChange={setScores}
          />
        </View>

        {/* Section 5: Overall Impressions & Rating */}
        <View style={styles.sectionChassis}>
          <Text style={styles.sectionEyebrow}>OVERALL IMPRESSIONS</Text>

          {/* Star Rating Picker */}
          <View style={styles.ratingPickerRow}>
            <Text style={styles.inputLabel}>RATING</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable
                  key={`rate-star-${star}`}
                  onPress={() => setRating(star)}
                  style={styles.starTouch}
                  accessibilityRole="button"
                  accessibilityLabel={`Rate ${star} stars`}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                >
                  <Star
                    size={26}
                    color={star <= rating ? colors.accent : colors.textMuted}
                    fill={star <= rating ? colors.accent : 'none'}
                  />
                </Pressable>
              ))}
            </View>
          </View>

          {/* Tasting Notes */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>NOTES & TASTING IMPRESSIONS</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Impressions, draw-down clarity, body balance, cooling notes..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              accessibilityLabel="Tasting impressions"
            />
          </View>

          {/* Would Brew Again */}
          <Pressable
            style={styles.checkboxRow}
            onPress={() => setWouldBrewAgain(!wouldBrewAgain)}
            accessibilityRole="checkbox"
            accessibilityLabel="Would brew again"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <View
              style={[
                styles.checkboxBox,
                wouldBrewAgain && styles.checkboxBoxActive,
              ]}
            >
              {wouldBrewAgain && <Check size={14} color={colors.canvas} />}
            </View>
            <Text style={styles.checkboxText}>Would brew this recipe again</Text>
          </Pressable>
        </View>

        {/* Delete Button (Edit Mode Only) */}
        {isEditMode && (
          <View style={styles.deleteSection}>
            <Pressable
              style={styles.deleteButton}
              onPress={handleDelete}
              accessibilityRole="button"
              accessibilityLabel="Delete Review"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Trash2 size={16} color={colors.statusError} />
              <Text style={styles.deleteButtonText}>DELETE REVIEW</Text>
            </Pressable>
          </View>
        )}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

export const ReviewModalScreen: React.FC = () => {
  const params = useLocalSearchParams();
  const rawId = params?.id;
  const id = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : undefined;
  const { reviews, loading } = useReviews();

  if (Boolean(id) && loading) {
    return (
      <SafeAreaView edges={['top']} style={[styles.safeArea, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.accent} testID="review-modal-loading" />
      </SafeAreaView>
    );
  }

  const sourceItem = id ? reviews.find((item) => item.id === id) : undefined;

  const initialParams: Record<string, string | undefined> = {};
  if (params) {
    Object.keys(params).forEach((key) => {
      const val = params[key];
      if (typeof val === 'string') {
        initialParams[key] = val;
      }
    });
  }

  return (
    <ReviewModalForm
      key={sourceItem ? sourceItem.id : (id || 'new')}
      id={id}
      sourceItem={sourceItem}
      initialParams={initialParams}
    />
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 16,
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  navButton: {
    minWidth: 40,
    minHeight: 40,
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
    borderRadius: 6,
    paddingVertical: 7,
    paddingHorizontal: 14,
    minHeight: 36,
  },
  saveButtonText: {
    fontFamily: FONTS.monoBold,
    fontSize: 12,
    color: colors.canvas,
    letterSpacing: 1,
  },
  timerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(217, 119, 6, 0.1)',
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 8,
    padding: 12,
    gap: 10,
  },
  timerBannerTitle: {
    fontFamily: FONTS.monoBold,
    fontSize: 12,
    color: colors.accent,
    marginBottom: 2,
  },
  timerBannerSubtitle: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  timerBannerClear: {
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  timerBannerClearText: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  sectionChassis: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 8,
    padding: 14,
    gap: 12,
  },
  sectionEyebrow: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    color: colors.accent,
    letterSpacing: 1.2,
  },
  stashPickerContainer: {
    gap: 6,
  },
  subLabel: {
    fontFamily: FONTS.monoMedium,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  horizontalChips: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  beanChip: {
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 8,
    minHeight: 34,
    justifyContent: 'center',
  },
  beanChipSelected: {
    backgroundColor: colors.panel,
    borderColor: colors.accent,
  },
  beanChipText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  beanChipTextSelected: {
    color: colors.accent,
    fontFamily: FONTS.bodyBold,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  input: {
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontFamily: FONTS.bodyRegular,
    fontSize: 14,
    color: colors.textPrimary,
    minHeight: 44,
  },
  textArea: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  chip: {
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 8,
    minHeight: 34,
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: colors.panel,
    borderColor: colors.accent,
  },
  chipText: {
    fontFamily: FONTS.monoMedium,
    fontSize: 11,
    color: colors.textMuted,
  },
  chipTextActive: {
    color: colors.accent,
    fontFamily: FONTS.monoBold,
  },
  specsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  specGridItem: {
    flex: 1,
    gap: 4,
  },
  ratingPickerRow: {
    gap: 6,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    paddingVertical: 4,
  },
  starTouch: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 44,
    paddingVertical: 4,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.panelRecessed,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxBoxActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  checkboxText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: colors.textPrimary,
  },
  deleteSection: {
    marginTop: 8,
    alignItems: 'center',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.statusError,
    borderRadius: 6,
    minHeight: 44,
    paddingHorizontal: 16,
    justifyContent: 'center',
    width: '100%',
  },
  deleteButtonText: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    color: colors.statusError,
    letterSpacing: 1,
  },
});
