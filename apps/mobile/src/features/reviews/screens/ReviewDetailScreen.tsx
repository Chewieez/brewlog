import React, { useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  Alert,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Star, Edit3, Trash2, Check } from 'lucide-react-native';
import { TastingLog, INDUSTRIAL_PRECISION_THEME } from '@brewlog/core';
import { FONTS } from '../../../theme/fonts';
import { useReviews } from '../ReviewsContext';
import { ScaAttributeScoring } from '../components/ScaAttributeScoring';

const { colors } = INDUSTRIAL_PRECISION_THEME;

export const ReviewDetailScreen: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params?.id;
  const { reviews, loading, deleteReview } = useReviews();

  const review = useMemo(
    () => (id ? reviews.find((r) => r.id === id) : undefined),
    [id, reviews]
  );

  if (Boolean(id) && loading) {
    return (
      <SafeAreaView edges={['top']} style={[styles.safeArea, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.accent} testID="review-detail-loading" />
      </SafeAreaView>
    );
  }

  if (!review) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.notFoundContainer}>
          <Text style={styles.notFoundTitle}>Review not found</Text>
          <Text style={styles.notFoundSubtitle}>
            This review might have been removed or does not exist.
          </Text>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back to Reviews"
          >
            <Text style={styles.backButtonText}>BACK TO REVIEWS</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const formattedDate = review.brewDate
    ? new Date(review.brewDate).toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  const formattedTime = review.actualTimeSeconds
    ? `${Math.floor(review.actualTimeSeconds / 60)}:${(review.actualTimeSeconds % 60).toString().padStart(2, '0')}`
    : '--';

  const ratio =
    review.coffeeDoseGrams > 0
      ? `1 : ${(review.waterAmountGrams / review.coffeeDoseGrams).toFixed(1)}`
      : '--';

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
            router.back();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Hero Card */}
        <View style={styles.heroCard}>
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
            <Text style={styles.roasterEyebrow}>
              {review.roasterSnapshot.toUpperCase()}
            </Text>
            <Text style={styles.coffeeTitle}>{review.beanNameSnapshot}</Text>
          </View>

          {/* Star Rating */}
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={`detail-star-${star}`}
                size={20}
                color={star <= review.rating ? colors.accent : colors.textMuted}
                fill={star <= review.rating ? colors.accent : 'none'}
              />
            ))}
          </View>
        </View>

        {/* Equipment & Brew Specs Chassis */}
        <View style={styles.sectionChassis}>
          <Text style={styles.sectionEyebrow}>EQUIPMENT & BREW PARAMETERS</Text>

          {(review.grinderSnapshot || review.brewerSnapshot) && (
            <View style={styles.equipmentRow}>
              {review.grinderSnapshot && (
                <View style={styles.equipmentCol}>
                  <Text style={styles.paramLabel}>GRINDER</Text>
                  <Text style={styles.paramValue}>
                    {review.grinderSnapshot}
                    {review.grindSetting ? ` @ ${review.grindSetting}` : ''}
                  </Text>
                </View>
              )}

              {review.brewerSnapshot && (
                <View style={styles.equipmentCol}>
                  <Text style={styles.paramLabel}>BREWER</Text>
                  <Text style={styles.paramValue}>{review.brewerSnapshot}</Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.specsGrid}>
            <View style={styles.specItem}>
              <Text style={styles.paramLabel}>DOSE</Text>
              <Text style={styles.specValue}>{review.coffeeDoseGrams}g</Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.paramLabel}>WATER</Text>
              <Text style={styles.specValue}>{review.waterAmountGrams}g</Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.paramLabel}>RATIO</Text>
              <Text style={styles.specValue}>{ratio}</Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.paramLabel}>TIME</Text>
              <Text style={styles.specValue}>{formattedTime}</Text>
            </View>
            {review.waterTempCelsius ? (
              <View style={styles.specItem}>
                <Text style={styles.paramLabel}>TEMP</Text>
                <Text style={styles.specValue}>{review.waterTempCelsius}°C</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Flavor Notes Card */}
        {review.flavorTags && review.flavorTags.length > 0 && (
          <View style={styles.sectionChassis}>
            <Text style={styles.sectionEyebrow}>FLAVOR DESCRIPTORS</Text>
            <View style={styles.tagsContainer}>
              {review.flavorTags.map((tag) => (
                <View key={`detail-tag-${tag}`} style={styles.tagChip}>
                  <Text style={styles.tagChipText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* SCA Sensory Scoring Breakdown */}
        <View style={styles.sectionChassis}>
          <Text style={styles.sectionEyebrow}>SCA SENSORY PROTOCOL</Text>
          <ScaAttributeScoring
            scores={review.scores}
            onChange={() => {}}
            readOnly={true}
          />
        </View>

        {/* Cupper Impressions & Notes */}
        {review.notes ? (
          <View style={styles.sectionChassis}>
            <Text style={styles.sectionEyebrow}>CUPPER IMPRESSIONS</Text>
            <Text style={styles.notesText}>{review.notes}</Text>
          </View>
        ) : null}

        {/* Would Brew Again Indicator */}
        {review.wouldBrewAgain && (
          <View style={styles.wouldBrewBanner}>
            <Check size={16} color={colors.accent} />
            <Text style={styles.wouldBrewText}>
              Marked to brew this recipe again
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <Pressable
            style={styles.editButton}
            onPress={handleEdit}
            accessibilityRole="button"
            accessibilityLabel="Edit Review"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Edit3 size={16} color={colors.canvas} />
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
    </SafeAreaView>
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
    padding: 16,
    gap: 16,
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
    borderRadius: 6,
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
    borderRadius: 8,
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
    borderRadius: 4,
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
    fontFamily: FONTS.monoRegular,
    fontSize: 12,
    color: colors.textMuted,
  },
  titleSection: {
    gap: 2,
  },
  roasterEyebrow: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    color: colors.accent,
    letterSpacing: 1.2,
  },
  coffeeTitle: {
    fontFamily: FONTS.displayBold,
    fontSize: 22,
    color: colors.textPrimary,
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    marginTop: 2,
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
    color: colors.textMuted,
    letterSpacing: 1.2,
  },
  equipmentRow: {
    backgroundColor: colors.panelRecessed,
    borderRadius: 6,
    padding: 10,
    gap: 8,
  },
  equipmentCol: {
    gap: 2,
  },
  paramLabel: {
    fontFamily: FONTS.monoBold,
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  paramValue: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: colors.textPrimary,
  },
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  specItem: {
    minWidth: 64,
    gap: 2,
  },
  specValue: {
    fontFamily: FONTS.monoBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  tagChipText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  notesText: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  wouldBrewAgain: {
    color: colors.statusSuccess,
  },
  wouldBrewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(217, 119, 6, 0.1)',
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 8,
    padding: 12,
  },
  wouldBrewText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: colors.textPrimary,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  editButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    borderRadius: 6,
    minHeight: 44,
    paddingHorizontal: 16,
  },
  editButtonText: {
    fontFamily: FONTS.monoBold,
    fontSize: 12,
    color: colors.canvas,
    letterSpacing: 1,
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.statusError,
    borderRadius: 6,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  deleteButtonText: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    color: colors.statusError,
    letterSpacing: 1,
  },
});
