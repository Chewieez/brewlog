import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Star, Edit3, Trash2, CheckCircle2, Play } from 'lucide-react-native';
import {
  formatDisplayDate,
  getScaTierInfo,
  ScaTierKey,
} from '@brewlog/core';
import {
  makeStyles,
  useTheme,
  SegmentedControl,
  ThemeColors,
} from '@brewlog/ui';
import { useOptionalSettings } from '../../settings/SettingsContext';
import { useOptionalStash } from '../../stash/StashContext';
import { useOptionalRecipes } from '../../recipes/RecipeContext';
import { FONTS } from '../../../theme/fonts';
import { useReviews } from '../ReviewsContext';
import { ScaAttributeScoring } from '../components/ScaAttributeScoring';
import { ScaFlavorWheelSvg } from '../components/ScaFlavorWheelSvg';

function getTierColor(key: ScaTierKey, colors: ThemeColors): string {
  switch (key) {
    case 'outstanding':
      return colors.statusSuccess;
    case 'excellent':
      return colors.statusWarning;
    case 'very-good':
      return colors.statusInfo;
    case 'commercial':
    default:
      return colors.textMuted;
  }
}

function formatBrewDuration(seconds: number): string {
  if (!seconds && seconds !== 0) return '—';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  }
  return `${secs}s`;
}

export const ReviewDetailScreen: React.FC = () => {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params?.id;
  const { reviews, loading, deleteReview } = useReviews();
  const settingsContext = useOptionalSettings();
  const stash = useOptionalStash();
  const recipeContext = useOptionalRecipes();
  const [sensoryTab, setSensoryTab] = useState<'descriptors' | 'wheel'>('descriptors');

  const review = useMemo(
    () => (id ? reviews.find((r) => r.id === id) : undefined),
    [id, reviews]
  );

  if (Boolean(id) && loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.accent} testID="review-detail-loading" />
      </View>
    );
  }

  const handleBack = () => {
    if (router.canGoBack?.()) {
      router.back();
    } else {
      router.replace('/(tabs)/reviews');
    }
  };

  if (!review) {
    return (
      <View style={styles.notFoundContainer}>
        <Text style={styles.notFoundTitle}>Review not found</Text>
        <Text style={styles.notFoundSubtitle}>
          This review might have been removed or does not exist.
        </Text>
        <Pressable
          style={styles.backButton}
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Back to Reviews"
        >
          <Text style={styles.backButtonText}>BACK TO REVIEWS</Text>
        </Pressable>
      </View>
    );
  }

  const dateFormat = settingsContext?.settings.dateFormat ?? 'locale';
  const formattedDate = review.brewDate
    ? formatDisplayDate(review.brewDate, dateFormat)
    : '';
  const formattedTime = formatBrewDuration(review.actualTimeSeconds);
  const ratio =
    review.coffeeDoseGrams > 0 && review.waterAmountGrams > 0
      ? `1:${(review.waterAmountGrams / review.coffeeDoseGrams).toFixed(1)}`
      : '—';

  const beanName = review.beanNameSnapshot || 'Specialty Coffee';
  const roaster = review.roasterSnapshot || 'Artisan Roaster';
  const scaScore = Number(review.calculatedScaScore ?? 0);
  const tier = getScaTierInfo(scaScore);
  const tierColor = getTierColor(tier.key, colors);

  const executeBrewAgain = () => {
    const beans = stash?.beans ?? [];
    const matchedBean =
      (review.beanId ? beans.find((b) => b.id === review.beanId) : undefined) ??
      (review.beanNameSnapshot
        ? beans.find(
            (b) => b.name.toLowerCase() === review.beanNameSnapshot.toLowerCase()
          )
        : undefined);
    if (matchedBean) {
      stash?.setActiveBrewBean(matchedBean);
    }

    const recipes = recipeContext?.recipes ?? [];
    const matchedRecipe =
      (review.recipeId
        ? recipes.find((r) => r.id === review.recipeId)
        : undefined) ??
      (review.brewMethod
        ? recipes.find((r) => r.brewMethod === review.brewMethod)
        : undefined);
    if (matchedRecipe) {
      const targetDose =
        review.coffeeDoseGrams > 0
          ? review.coffeeDoseGrams
          : matchedRecipe.coffeeDoseGrams;
      recipeContext?.setActiveTimerRecipe(matchedRecipe, targetDose);
    }

    router.replace({ pathname: '/(tabs)', params: { mode: 'recipe' } });
  };

  const handleBrewAgain = () => {
    if (recipeContext?.isBrewActive) {
      Alert.alert(
        'Switch Recipe?',
        'A brew is currently in progress. Switching recipes will reset your timer.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Reset & Switch',
            style: 'destructive',
            onPress: executeBrewAgain,
          },
        ]
      );
      return;
    }

    executeBrewAgain();
  };

  const handleEdit = () => {
    router.push({
      pathname: '/reviews/modal',
      params: { id: review.id },
    });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Review?',
      'This action cannot be undone. Are you sure you want to delete this review?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteReview(review.id);
            handleBack();
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Header Card */}
      <View testID="detail-header-card" style={styles.heroCard}>
        <View style={styles.heroMetaRow}>
          <View style={styles.methodBadge}>
            <Text style={styles.methodBadgeText}>
              {review.brewMethod.toUpperCase()}
            </Text>
          </View>
          {formattedDate ? (
            <Text style={styles.dateText}>{formattedDate}</Text>
          ) : null}
        </View>

        <View style={styles.titleSection}>
          <Text style={styles.coffeeTitle}>{beanName}</Text>
          <Text style={styles.roasterSubtitle}>{roaster}</Text>
        </View>
      </View>

      {/* Brew Again Primary CTA */}
      <Pressable
        testID="detail-brew-again-button"
        style={({ pressed }) => [styles.brewAgainButton, pressed && styles.brewAgainPressed]}
        onPress={handleBrewAgain}
        accessibilityRole="button"
        accessibilityLabel="Brew Again"
      >
        <Play size={16} color={colors.canvas} fill={colors.canvas} />
        <Text style={styles.brewAgainButtonText}>BREW AGAIN</Text>
      </Pressable>

      {/* 2. Hero Score Banner */}
      <View testID="detail-hero-score" style={styles.sectionChassis}>
        <View style={styles.scoreBannerRow}>
          <View style={styles.scoreCluster}>
            <Text style={styles.scoreNumber}>{scaScore.toFixed(1)}</Text>
            <Text style={styles.scoreDenominator}>/ 100</Text>
            <View style={styles.scoreDivider} />
            <View
              style={[
                styles.tierBadge,
                {
                  borderColor: `${tierColor}55`,
                  backgroundColor: `${tierColor}18`,
                },
              ]}
            >
              <Text style={[styles.tierBadgeText, { color: tierColor }]}>
                {tier.label} (SCA)
              </Text>
            </View>
          </View>

          <View style={styles.ratingCluster}>
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={`detail-star-${star}`}
                  size={16}
                  color={star <= (review.rating || 0) ? colors.accent : colors.textMuted}
                  fill={star <= (review.rating || 0) ? colors.accent : 'none'}
                />
              ))}
              <Text style={styles.ratingFraction}>({review.rating || 0}/5)</Text>
            </View>

            {review.wouldBrewAgain && (
              <View
                style={[
                  styles.wouldBrewPill,
                  {
                    borderColor: `${colors.statusSuccess}55`,
                    backgroundColor: `${colors.statusSuccess}18`,
                  },
                ]}
              >
                <CheckCircle2 size={12} color={colors.statusSuccess} />
                <Text style={[styles.wouldBrewPillText, { color: colors.statusSuccess }]}>
                  Would Brew Again
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* 3. Sensory Profile (Descriptors / Wheel) */}
      <View testID="detail-sensory-profile" style={styles.sectionChassis}>
        <Text style={styles.sectionEyebrow}>SENSORY PROFILE</Text>
        <SegmentedControl<'descriptors' | 'wheel'>
          size="sm"
          fullWidth
          value={sensoryTab}
          onChange={setSensoryTab}
          ariaLabel="Sensory profile view mode"
          options={[
            { value: 'descriptors', label: 'Descriptors' },
            { value: 'wheel', label: 'Wheel' },
          ]}
        />

        {sensoryTab === 'descriptors' ? (
          review.flavorTags && review.flavorTags.length > 0 ? (
            <View style={styles.tagsContainer}>
              {review.flavorTags.map((tag) => (
                <View key={`detail-tag-${tag}`} style={styles.tagChip}>
                  <Text style={styles.tagChipText}>{tag}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyDescriptorsText}>
              No flavor descriptors recorded for this brew.
            </Text>
          )
        ) : (
          <ScaFlavorWheelSvg
            selectedTags={review.flavorTags || []}
            onToggleTag={() => {}}
            readOnly={true}
          />
        )}
      </View>

      {/* 4. 10-Attribute SCA Score Matrix */}
      <View testID="detail-score-matrix" style={styles.sectionChassis}>
        <Text style={styles.sectionEyebrow}>10-ATTRIBUTE SCA SCORE MATRIX</Text>
        <ScaAttributeScoring
          scores={review.scores}
          onChange={() => {}}
          readOnly={true}
          hideSummaryHero={true}
        />
      </View>

      {/* 5. Brew Parameters & Equipment */}
      <View testID="detail-brew-specs" style={styles.sectionChassis}>
        <Text style={styles.sectionEyebrow}>BREW PARAMETERS & EQUIPMENT</Text>

        <View style={styles.specsGrid}>
          <View style={styles.specTile}>
            <Text style={styles.paramLabel}>DOSE</Text>
            <Text style={styles.specValue}>{review.coffeeDoseGrams}g</Text>
          </View>
          <View style={styles.specTile}>
            <Text style={styles.paramLabel}>WATER</Text>
            <Text style={styles.specValue}>{review.waterAmountGrams}g</Text>
          </View>
          <View style={styles.specTile}>
            <Text style={styles.paramLabel}>RATIO</Text>
            <Text style={styles.specValue}>{ratio}</Text>
          </View>
          <View style={styles.specTile}>
            <Text style={styles.paramLabel}>ACTUAL TIME</Text>
            <Text style={styles.specValue}>{formattedTime}</Text>
          </View>
        </View>

        <View style={styles.equipmentRow}>
          <View style={styles.equipmentCol}>
            <Text style={styles.paramLabel}>GRINDER & SETTING</Text>
            <Text style={styles.paramValue}>
              {review.grinderSnapshot || 'Not specified'}
            </Text>
            {review.grindSetting ? (
              <Text style={styles.paramSubValue}>
                Setting: {review.grindSetting}
              </Text>
            ) : null}
          </View>

          <View style={styles.equipmentCol}>
            <Text style={styles.paramLabel}>BREWER</Text>
            <Text style={styles.paramValue}>
              {review.brewerSnapshot || 'Not specified'}
            </Text>
          </View>

          <View style={styles.equipmentCol}>
            <Text style={styles.paramLabel}>WATER TEMPERATURE</Text>
            <Text style={styles.paramValue}>
              {review.waterTempCelsius ? `${review.waterTempCelsius}°C` : 'Not recorded'}
            </Text>
          </View>
        </View>
      </View>

      {/* 6. Cupper's Tasting Notes */}
      {review.notes ? (
        <View testID="detail-tasting-notes" style={styles.sectionChassis}>
          <Text style={styles.sectionEyebrow}>CUPPER'S TASTING NOTES</Text>
          <View style={styles.notesQuoteBox}>
            <Text style={styles.notesText}>"{review.notes}"</Text>
          </View>
        </View>
      ) : null}

      {/* Secondary / Destructive Footer Actions */}
      <View testID="detail-actions-footer" style={styles.actionRow}>
        <Pressable
          style={styles.editButton}
          onPress={handleEdit}
          accessibilityRole="button"
          accessibilityLabel="Edit Review"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Edit3 size={16} color={colors.textPrimary} />
          <Text style={styles.editButtonText}>EDIT REVIEW</Text>
        </Pressable>

        <Pressable
          style={styles.deleteButton}
          onPress={handleDelete}
          accessibilityRole="button"
          accessibilityLabel="Delete Review"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Trash2 size={16} color={colors.statusError} />
          <Text style={styles.deleteButtonText}>DELETE</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
};

const useStyles = makeStyles((colors) => ({
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  content: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  notFoundContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  notFoundTitle: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 20,
    color: colors.textPrimary,
  },
  notFoundSubtitle: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  backButtonText: {
    fontFamily: FONTS.monoBold,
    fontSize: 12,
    color: colors.accent,
    letterSpacing: 1,
  },
  heroCard: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  heroMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  methodBadge: {
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  methodBadgeText: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    color: colors.accent,
    letterSpacing: 1,
  },
  dateText: {
    fontFamily: FONTS.sansRegular,
    fontSize: 12,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  titleSection: {
    gap: 2,
  },
  coffeeTitle: {
    fontFamily: FONTS.displayBold,
    fontSize: 22,
    color: colors.textPrimary,
  },
  roasterSubtitle: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: colors.textSecondary,
  },
  brewAgainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    borderRadius: 8,
    minHeight: 44,
    paddingHorizontal: 16,
  },
  brewAgainPressed: {
    opacity: 0.85,
  },
  brewAgainButtonText: {
    fontFamily: FONTS.monoBold,
    fontSize: 12,
    color: colors.canvas,
    letterSpacing: 1,
  },
  sectionChassis: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  sectionEyebrow: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 1.1,
  },
  scoreBannerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  scoreCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scoreNumber: {
    fontFamily: FONTS.displayLight,
    fontSize: 32,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  scoreDenominator: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  scoreDivider: {
    width: 1,
    height: 22,
    backgroundColor: colors.borderSubtle,
    marginHorizontal: 2,
  },
  tierBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 9,
  },
  tierBadgeText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 12,
  },
  ratingCluster: {
    alignItems: 'flex-end',
    gap: 6,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingFraction: {
    fontFamily: FONTS.sansMedium,
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 2,
    fontVariant: ['tabular-nums'],
  },
  wouldBrewPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  wouldBrewPillText: {
    fontFamily: FONTS.sansMedium,
    fontSize: 11,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    backgroundColor: `${colors.accent}18`,
    borderWidth: 1,
    borderColor: `${colors.accent}35`,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  tagChipText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: colors.accent,
  },
  emptyDescriptorsText: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specTile: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 8,
    padding: 10,
    gap: 2,
  },
  equipmentRow: {
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 8,
    padding: 12,
    gap: 10,
  },
  equipmentCol: {
    gap: 2,
  },
  paramLabel: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  paramValue: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: colors.textPrimary,
  },
  paramSubValue: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
    color: colors.textSecondary,
  },
  specValue: {
    fontFamily: FONTS.sansBold,
    fontSize: 14,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  notesQuoteBox: {
    borderLeftWidth: 2,
    borderLeftColor: colors.accent,
    paddingLeft: 12,
    paddingVertical: 2,
  },
  notesText: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 14,
    color: colors.textPrimary,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 8,
    minHeight: 44,
    paddingHorizontal: 14,
  },
  editButtonText: {
    fontFamily: FONTS.monoBold,
    fontSize: 12,
    color: colors.textPrimary,
    letterSpacing: 1,
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.statusError,
    borderRadius: 8,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  deleteButtonText: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    color: colors.statusError,
    letterSpacing: 1,
  },
}));
