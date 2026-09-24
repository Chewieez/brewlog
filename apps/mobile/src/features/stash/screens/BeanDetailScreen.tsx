import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  Play,
  Snowflake,
  Edit2,
  Archive,
  Trash2,
  Star,
  Clock,
  Sparkles,
  Scale,
  Check,
} from 'lucide-react-native';
import { Bean, INDUSTRIAL_PRECISION_THEME } from '@brewlog/core';
import { useStash } from '../StashContext';
import { calculateBeanRestingInfo, BeanRestingInfo } from '../utils/restingUtils';
import { FONTS } from '../../../theme/fonts';

const { colors } = INDUSTRIAL_PRECISION_THEME;

export interface BeanDetailScreenProps {
  beanId?: string;
}

const RESTING_STAGES: Array<{
  id: BeanRestingInfo['status'];
  label: string;
}> = [
  { id: 'resting', label: 'RESTING' },
  { id: 'peak', label: 'PEAK' },
  { id: 'aging', label: 'AGING' },
  { id: 'past-peak', label: 'PAST PEAK' },
];

export const BeanDetailScreen: React.FC<BeanDetailScreenProps> = ({ beanId }) => {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id =
    beanId ?? (Array.isArray(params.id) ? params.id[0] : params.id) ?? '';

  const {
    beans,
    setActiveBrewBean,
    updateBean,
    toggleFrozen,
    toggleFavorite,
    archiveBean,
    unarchiveBean,
    deleteBean,
  } = useStash();

  const bean = beans.find((b) => b.id === id);

  const [isEditingWeight, setIsEditingWeight] = useState<boolean>(false);
  const [customWeightText, setCustomWeightText] = useState<string>('');

  const restingInfo = bean ? calculateBeanRestingInfo(bean) : null;

  const currentRemaining = bean?.remainingGrams ?? bean?.bagWeightGrams ?? 0;
  const bagTotal = bean?.bagWeightGrams ?? currentRemaining;
  const inventoryPercent =
    bagTotal > 0
      ? Math.min(100, Math.max(0, Math.round((currentRemaining / bagTotal) * 100)))
      : 0;
  const isLowWeight = currentRemaining < 40;

  const handleBrew = useCallback(() => {
    if (!bean) return;
    setActiveBrewBean(bean);
    router.push('/(tabs)');
  }, [bean, setActiveBrewBean, router]);

  const handleToggleFreeze = useCallback(async () => {
    if (!bean) return;
    await toggleFrozen(bean.id);
  }, [bean, toggleFrozen]);

  const handleToggleFavorite = useCallback(async () => {
    if (!bean) return;
    await toggleFavorite(bean.id);
  }, [bean, toggleFavorite]);

  const handleEdit = useCallback(() => {
    if (!bean) return;
    router.push({
      pathname: '/stash/modal',
      params: { id: bean.id },
    });
  }, [bean, router]);

  const handleArchiveToggle = useCallback(async () => {
    if (!bean) return;
    if (bean.isArchived) {
      await unarchiveBean(bean.id);
    } else {
      await archiveBean(bean.id);
    }
  }, [bean, archiveBean, unarchiveBean]);

  const handleDelete = useCallback(() => {
    if (!bean) return;
    Alert.alert(
      'Delete Coffee?',
      `Are you sure you want to delete "${bean.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteBean(bean.id);
            router.back();
          },
        },
      ]
    );
  }, [bean, deleteBean, router]);

  const handleQuickDose = useCallback(
    async (deltaGrams: number) => {
      if (!bean) return;
      const nextWeight = Math.max(0, currentRemaining + deltaGrams);
      await updateBean(bean.id, { remainingGrams: nextWeight });
    },
    [bean, currentRemaining, updateBean]
  );

  const handleSaveCustomWeight = useCallback(async () => {
    if (!bean) return;
    const parsed = parseFloat(customWeightText.trim());
    if (!isNaN(parsed) && parsed >= 0) {
      await updateBean(bean.id, { remainingGrams: Math.round(parsed) });
    }
    setIsEditingWeight(false);
    setCustomWeightText('');
  }, [bean, customWeightText, updateBean]);

  if (!bean || !restingInfo) {
    return (
      <View style={styles.notFoundContainer}>
        <Text style={styles.notFoundTitle}>Coffee Not Found</Text>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Return to Stash"
        >
          <Text style={styles.backButtonText}>Return to Stash</Text>
        </Pressable>
      </View>
    );
  }

  // Format Origin and Region
  let originRegionText = '';
  if (bean.originCountry && bean.region) {
    originRegionText = `${bean.originCountry} • ${bean.region}`;
  } else if (bean.originCountry) {
    originRegionText = bean.originCountry;
  } else if (bean.region) {
    originRegionText = bean.region;
  }

  const varietyDisplay = Array.isArray(bean.variety)
    ? bean.variety.join(', ')
    : bean.variety ?? '--';

  const currentStageIndex = RESTING_STAGES.findIndex(
    (stage) => stage.id === restingInfo.status
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* 1. Header Card */}
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.roasterEyebrow}>
              {bean.roaster.toUpperCase()}
            </Text>
            <Text style={styles.beanTitle}>{bean.name}</Text>
            {originRegionText ? (
              <Text style={styles.originSubtitle}>{originRegionText}</Text>
            ) : null}
          </View>

          <Pressable
            onPress={handleToggleFavorite}
            style={styles.favoriteButton}
            accessibilityRole="button"
            accessibilityLabel={
              bean.isFavorite ? 'Remove from favorites' : 'Add to favorites'
            }
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Star
              size={22}
              color={bean.isFavorite ? colors.accent : colors.textMuted}
              fill={bean.isFavorite ? colors.accent : 'none'}
            />
          </Pressable>
        </View>

        {/* Origin & Production Specs Grid */}
        <View style={styles.specsGrid}>
          {bean.originCountry ? (
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>ORIGIN</Text>
              <Text style={styles.specValue}>{bean.originCountry}</Text>
            </View>
          ) : null}

          {bean.region ? (
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>REGION</Text>
              <Text style={styles.specValue}>{bean.region}</Text>
            </View>
          ) : null}

          {bean.farm ? (
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>FARM / MILL</Text>
              <Text style={styles.specValue}>{bean.farm}</Text>
            </View>
          ) : null}

          {bean.variety ? (
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>VARIETY</Text>
              <Text style={styles.specValue}>{varietyDisplay}</Text>
            </View>
          ) : null}

          {bean.altitudeMeters ? (
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>ALTITUDE</Text>
              <Text style={styles.specValue}>{bean.altitudeMeters}m</Text>
            </View>
          ) : null}

          {bean.process ? (
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>PROCESS</Text>
              <Text style={styles.specValue}>
                {bean.process.toUpperCase()}
              </Text>
            </View>
          ) : null}

          {bean.roastLevel ? (
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>ROAST LEVEL</Text>
              <Text style={styles.specValue}>
                {bean.roastLevel.toUpperCase()}
              </Text>
            </View>
          ) : null}

          {bean.roastDate ? (
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>ROAST DATE</Text>
              <Text style={styles.specValue}>{bean.roastDate}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Primary Brew Session CTA */}
      <Pressable
        onPress={handleBrew}
        style={({ pressed }) => [
          styles.brewButton,
          pressed && styles.brewButtonPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Brew with this coffee"
      >
        <Play size={18} color={colors.canvas} fill={colors.canvas} />
        <Text style={styles.brewButtonText}>BREW WITH THIS COFFEE</Text>
      </Pressable>

      {/* 2. Resting Progression Timeline */}
      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Clock size={16} color={colors.accent} />
          <Text style={styles.cardTitle}>RESTING TIMELINE</Text>
          <View style={styles.flexSpacer} />
          <View
            style={[
              styles.restingBadge,
              { borderColor: restingInfo.badgeColor },
            ]}
          >
            <Text
              style={[
                styles.restingBadgeText,
                { color: restingInfo.badgeColor },
              ]}
            >
              {restingInfo.badgeLabel}
            </Text>
          </View>
        </View>

        {/* 4-Stage Segmented Curve */}
        <View style={styles.timelineCurveContainer}>
          {RESTING_STAGES.map((stage, stageIndex) => {
            const isCurrent = restingInfo.status === stage.id;
            const isHighlighted = stageIndex <= currentStageIndex;
            return (
              <View key={stage.id} style={styles.timelineStageSegment}>
                <View
                  style={[
                    styles.timelineSegmentBar,
                    isHighlighted
                      ? { backgroundColor: restingInfo.badgeColor }
                      : styles.timelineSegmentBarInactive,
                  ]}
                />
                <Text
                  style={[
                    styles.timelineStageLabel,
                    isCurrent && {
                      color: restingInfo.badgeColor,
                      fontFamily: FONTS.monoBold,
                    },
                  ]}
                >
                  {stage.label}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Resting Target Details */}
        <View style={styles.restingDetailsRow}>
          <Text style={styles.restingDetailText}>
            Current Age:{' '}
            <Text style={styles.restingDetailValue}>
              {bean.isFrozen
                ? `❄️ Day ${restingInfo.effectiveDays} (Frozen)`
                : `Day ${restingInfo.effectiveDays}`}
            </Text>
          </Text>
          <Text style={styles.restingDetailText}>
            Roaster Target:{' '}
            <Text style={styles.restingDetailValue}>
              {restingInfo.recommendedRestDays} days
            </Text>
          </Text>
        </View>
      </View>

      {/* 3. Inventory & Quick Stepper Card */}
      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Scale size={16} color={colors.accent} />
          <Text style={styles.cardTitle}>INVENTORY & DOSE CALIBRATION</Text>
        </View>

        {/* Weight Gauge */}
        <View style={styles.inventoryGaugeContainer}>
          <View style={styles.weightNumbersRow}>
            <Text style={styles.remainingWeightLarge}>
              {currentRemaining}
              <Text style={styles.weightUnit}>g</Text>
            </Text>
            <Text style={styles.totalBagWeight}>
              / {bagTotal}g left ({inventoryPercent}%)
            </Text>
          </View>

          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${inventoryPercent}%`,
                  backgroundColor: isLowWeight
                    ? colors.statusWarning
                    : colors.statusSuccess,
                },
              ]}
            />
          </View>
        </View>

        {/* Quick Calibration Steppers */}
        <View style={styles.stepperContainer}>
          <Text style={styles.stepperSectionLabel}>QUICK DOSE ADJUST</Text>
          <View style={styles.stepperRow}>
            <Pressable
              onPress={() => handleQuickDose(-18)}
              style={styles.stepperButton}
              accessibilityRole="button"
              accessibilityLabel="Deduct 18 grams"
            >
              <Text style={styles.stepperButtonText}>-18g</Text>
            </Pressable>

            <Pressable
              onPress={() => handleQuickDose(-15)}
              style={styles.stepperButton}
              accessibilityRole="button"
              accessibilityLabel="Deduct 15 grams"
            >
              <Text style={styles.stepperButtonText}>-15g</Text>
            </Pressable>

            <Pressable
              onPress={() => handleQuickDose(18)}
              style={styles.stepperButton}
              accessibilityRole="button"
              accessibilityLabel="Add 18 grams"
            >
              <Text style={styles.stepperButtonText}>+18g</Text>
            </Pressable>

            <Pressable
              onPress={() => setIsEditingWeight((prev) => !prev)}
              style={[
                styles.stepperButton,
                isEditingWeight && styles.stepperButtonActive,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Custom weight calibration"
            >
              <Text
                style={[
                  styles.stepperButtonText,
                  isEditingWeight && styles.stepperButtonTextActive,
                ]}
              >
                Set...
              </Text>
            </Pressable>
          </View>

          {isEditingWeight ? (
            <View style={styles.manualWeightInputRow}>
              <TextInput
                style={styles.manualWeightInput}
                placeholder="New weight in grams"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={customWeightText}
                onChangeText={setCustomWeightText}
                accessibilityLabel="Enter custom remaining weight in grams"
              />
              <Pressable
                onPress={handleSaveCustomWeight}
                style={styles.manualWeightSaveButton}
                accessibilityRole="button"
                accessibilityLabel="Save custom weight"
              >
                <Check size={16} color={colors.canvas} />
                <Text style={styles.manualWeightSaveButtonText}>Save</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>

      {/* 4. Sensory Profile & Notes Card */}
      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Sparkles size={16} color={colors.accent} />
          <Text style={styles.cardTitle}>SENSORY PROFILE</Text>
        </View>

        {bean.flavorNotes && bean.flavorNotes.length > 0 ? (
          <View style={styles.flavorNotesGroup}>
            {bean.flavorNotes.map((note, index) => (
              <View key={`${note}-${index}`} style={styles.flavorChip}>
                <Text style={styles.flavorChipText}>{note}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptySensoryText}>
            No flavor notes recorded for this coffee.
          </Text>
        )}

        {bean.notes ? (
          <View style={styles.roasterNotesContainer}>
            <Text style={styles.roasterNotesLabel}>TASTING NOTES</Text>
            <Text style={styles.roasterNotesText}>{bean.notes}</Text>
          </View>
        ) : null}
      </View>

      {/* 5. Action Toolbar */}
      <View style={styles.actionsFooter}>
        <Pressable
          onPress={handleToggleFreeze}
          style={styles.actionButton}
          accessibilityRole="button"
          accessibilityLabel={
            bean.isFrozen ? 'Thaw coffee' : 'Freeze coffee'
          }
        >
          <Snowflake
            size={16}
            color={bean.isFrozen ? colors.accent : colors.textPrimary}
          />
          <Text
            style={[
              styles.actionButtonText,
              bean.isFrozen && styles.actionButtonTextAccent,
            ]}
          >
            {bean.isFrozen ? 'Thaw Coffee' : 'Freeze Coffee'}
          </Text>
        </Pressable>

        <Pressable
          onPress={handleEdit}
          style={styles.actionButton}
          accessibilityRole="button"
          accessibilityLabel="Edit coffee"
        >
          <Edit2 size={16} color={colors.textPrimary} />
          <Text style={styles.actionButtonText}>Edit Coffee</Text>
        </Pressable>

        <Pressable
          onPress={handleArchiveToggle}
          style={styles.actionButton}
          accessibilityRole="button"
          accessibilityLabel={
            bean.isArchived ? 'Unarchive coffee' : 'Archive coffee'
          }
        >
          <Archive size={16} color={colors.textPrimary} />
          <Text style={styles.actionButtonText}>
            {bean.isArchived ? 'Unarchive Coffee' : 'Archive Coffee'}
          </Text>
        </Pressable>

        <Pressable
          onPress={handleDelete}
          style={[styles.actionButton, styles.deleteButton]}
          accessibilityRole="button"
          accessibilityLabel="Delete coffee"
        >
          <Trash2 size={16} color={colors.statusError} />
          <Text style={styles.deleteButtonText}>Delete Coffee</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 48,
  },
  notFoundContainer: {
    flex: 1,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  notFoundTitle: {
    fontFamily: FONTS.sansBold,
    fontSize: 18,
    color: colors.textPrimary,
  },
  backButton: {
    minHeight: 44,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 8,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  backButtonText: {
    fontFamily: FONTS.monoBold,
    fontSize: 12,
    color: colors.accent,
  },
  card: {
    backgroundColor: colors.panel,
    borderColor: colors.borderSubtle,
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerTextContainer: {
    flex: 1,
    marginRight: 12,
    gap: 4,
  },
  roasterEyebrow: {
    fontFamily: FONTS.monoBold,
    fontSize: 12,
    color: colors.accent,
    letterSpacing: 1.2,
  },
  beanTitle: {
    fontFamily: FONTS.sansBold,
    fontSize: 22,
    color: colors.textPrimary,
    lineHeight: 28,
  },
  originSubtitle: {
    fontFamily: FONTS.sansRegular,
    fontSize: 14,
    color: colors.textSecondary,
  },
  favoriteButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  specItem: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: colors.panelRecessed,
    borderColor: colors.borderSubtle,
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    gap: 4,
  },
  specLabel: {
    fontFamily: FONTS.monoRegular,
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  specValue: {
    fontFamily: FONTS.sansBold,
    fontSize: 13,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  brewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    minHeight: 48,
    borderRadius: 8,
    paddingHorizontal: 20,
  },
  brewButtonPressed: {
    opacity: 0.85,
  },
  brewButtonText: {
    fontFamily: FONTS.monoBold,
    fontSize: 13,
    color: colors.canvas,
    letterSpacing: 1.2,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  flexSpacer: {
    flex: 1,
  },
  restingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  restingBadgeText: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  timelineCurveContainer: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  timelineStageSegment: {
    flex: 1,
    gap: 6,
  },
  timelineSegmentBar: {
    height: 6,
    borderRadius: 3,
  },
  timelineSegmentBarInactive: {
    backgroundColor: colors.panelRecessed,
  },
  timelineStageLabel: {
    fontFamily: FONTS.monoRegular,
    fontSize: 9,
    color: colors.textMuted,
    textAlign: 'center',
    letterSpacing: 0.6,
  },
  restingDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.panelRecessed,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 4,
  },
  restingDetailText: {
    fontFamily: FONTS.monoRegular,
    fontSize: 11,
    color: colors.textSecondary,
  },
  restingDetailValue: {
    fontFamily: FONTS.sansBold,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  inventoryGaugeContainer: {
    gap: 8,
  },
  weightNumbersRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  remainingWeightLarge: {
    fontFamily: FONTS.sansBold,
    fontSize: 28,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  weightUnit: {
    fontSize: 18,
    color: colors.textMuted,
  },
  totalBagWeight: {
    fontFamily: FONTS.sansRegular,
    fontSize: 13,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: colors.panelRecessed,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  stepperContainer: {
    gap: 8,
    marginTop: 4,
  },
  stepperSectionLabel: {
    fontFamily: FONTS.monoRegular,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  stepperRow: {
    flexDirection: 'row',
    gap: 8,
  },
  stepperButton: {
    flex: 1,
    minHeight: 44,
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  stepperButtonActive: {
    borderColor: colors.accent,
  },
  stepperButtonText: {
    fontFamily: FONTS.sansBold,
    fontSize: 12,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  stepperButtonTextActive: {
    color: colors.accent,
  },
  manualWeightInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  manualWeightInput: {
    flex: 1,
    minHeight: 44,
    backgroundColor: colors.panelRecessed,
    borderColor: colors.borderSubtle,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    fontFamily: FONTS.sansMedium,
    fontSize: 13,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  manualWeightSaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accent,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 6,
    justifyContent: 'center',
  },
  manualWeightSaveButtonText: {
    fontFamily: FONTS.monoBold,
    fontSize: 12,
    color: colors.canvas,
  },
  flavorNotesGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  flavorChip: {
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  flavorChipText: {
    fontFamily: FONTS.monoRegular,
    fontSize: 12,
    color: colors.textPrimary,
  },
  emptySensoryText: {
    fontFamily: FONTS.sansRegular,
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  roasterNotesContainer: {
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 6,
    padding: 12,
    gap: 6,
  },
  roasterNotesLabel: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    color: colors.accent,
    letterSpacing: 0.8,
  },
  roasterNotesText: {
    fontFamily: FONTS.sansRegular,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  actionsFooter: {
    gap: 10,
    marginTop: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 8,
    minHeight: 44,
    paddingHorizontal: 16,
  },
  actionButtonText: {
    fontFamily: FONTS.monoBold,
    fontSize: 12,
    color: colors.textPrimary,
  },
  actionButtonTextAccent: {
    color: colors.accent,
  },
  deleteButton: {
    borderColor: colors.statusError,
  },
  deleteButtonText: {
    fontFamily: FONTS.monoBold,
    fontSize: 12,
    color: colors.statusError,
  },
});
