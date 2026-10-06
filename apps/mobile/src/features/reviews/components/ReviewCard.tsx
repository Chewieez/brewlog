import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';
import { TastingLog, INDUSTRIAL_PRECISION_THEME } from '@brewlog/core';
import { FONTS } from '../../../theme/fonts';

const { colors } = INDUSTRIAL_PRECISION_THEME;

export interface ReviewCardProps {
  review: TastingLog;
  onPress: (review: TastingLog) => void;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({ review, onPress }) => {
  const formattedDate = (() => {
    if (!review.brewDate) return '';
    const date = new Date(review.brewDate);
    if (isNaN(date.getTime())) return '';
    const mm = (date.getMonth() + 1).toString().padStart(2, '0');
    const dd = date.getDate().toString().padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  })();

  const scaScore = Number(review.calculatedScaScore ?? 0);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => onPress(review)}
      accessibilityRole="button"
      accessibilityLabel={`Review for ${review.beanNameSnapshot}`}
    >
      {/* Header Row: Roaster Eyebrow, Coffee Name & Star Rating + Date */}
      <View style={styles.headerRow}>
        <View style={styles.titleSection}>
          <Text style={styles.roasterEyebrow}>
            {review.roasterSnapshot.toUpperCase()}
          </Text>
          <Text style={styles.coffeeName} numberOfLines={1}>
            {review.beanNameSnapshot}
          </Text>
        </View>

        <View style={styles.headerRightCol}>
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={`star-${star}`}
                size={14}
                color={star <= review.rating ? colors.accent : colors.textMuted}
                fill={star <= review.rating ? colors.accent : 'none'}
              />
            ))}
          </View>
          {formattedDate ? (
            <Text style={styles.dateText}>{formattedDate}</Text>
          ) : null}
        </View>
      </View>

      {/* Badges / Meta Row: Method Badge */}
      <View style={styles.badgeRow}>
        <View style={styles.methodBadge}>
          <Text style={styles.methodBadgeText}>
            {review.brewMethod.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Equipment Snapshot Row */}
      {(review.grinderSnapshot || review.brewerSnapshot || review.grindSetting) && (
        <View style={styles.equipmentRow}>
          <Text style={styles.equipmentText} numberOfLines={1}>
            {review.grinderSnapshot ? `${review.grinderSnapshot}` : ''}
            {review.grindSetting ? ` @ ${review.grindSetting}` : ''}
            {review.grinderSnapshot && review.brewerSnapshot ? ' • ' : ''}
            {review.brewerSnapshot ? `${review.brewerSnapshot}` : ''}
          </Text>
        </View>
      )}

      {/* Specs Row */}
      <View style={styles.specsRow}>
        <Text style={styles.specsText}>
          {review.coffeeDoseGrams}g : {review.waterAmountGrams}g
          {review.actualTimeSeconds ? ` • ${Math.floor(review.actualTimeSeconds / 60)}:${(review.actualTimeSeconds % 60).toString().padStart(2, '0')}` : ''}
          {review.waterTempCelsius ? ` • ${review.waterTempCelsius}°C` : ''}
        </Text>

        {scaScore > 0 && (
          <View style={styles.scaBadge}>
            <Text style={styles.scaLabel}>SCA</Text>
            <Text style={styles.scaValue}>{scaScore.toFixed(1)}</Text>
          </View>
        )}
      </View>

      {/* Flavor Tags */}
      {review.flavorTags && review.flavorTags.length > 0 && (
        <View style={styles.tagsContainer}>
          {review.flavorTags.slice(0, 4).map((tag) => (
            <View key={`tag-${tag}`} style={styles.tagChip}>
              <Text style={styles.tagChipText}>{tag}</Text>
            </View>
          ))}
          {review.flavorTags.length > 4 && (
            <Text style={styles.extraTagsText}>
              +{review.flavorTags.length - 4}
            </Text>
          )}
        </View>
      )}

      {/* Notes Snippet */}
      {review.notes ? (
        <Text style={styles.notesText} numberOfLines={2}>
          {review.notes}
        </Text>
      ) : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 8,
    padding: 14,
    gap: 8,
  },
  cardPressed: {
    opacity: 0.85,
    borderColor: colors.accent,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  methodBadge: {
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  methodBadgeText: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    color: colors.accent,
    letterSpacing: 1,
  },
  headerRightCol: {
    alignItems: 'flex-end',
    gap: 4,
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  dateText: {
    fontFamily: FONTS.sansRegular,
    fontSize: 11,
    color: colors.textMuted,
  },
  titleSection: {
    flex: 1,
    gap: 2,
  },
  roasterEyebrow: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    color: colors.accent,
    letterSpacing: 1.2,
  },
  coffeeName: {
    fontFamily: FONTS.displayMedium,
    fontSize: 17,
    color: colors.textPrimary,
  },
  equipmentRow: {
    backgroundColor: colors.panelRecessed,
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  equipmentText: {
    fontFamily: FONTS.sansRegular,
    fontSize: 11,
    color: colors.textSecondary,
  },
  specsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  specsText: {
    fontFamily: FONTS.sansMedium,
    fontSize: 12,
    color: colors.textMuted,
  },
  scaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  scaLabel: {
    fontFamily: FONTS.monoBold,
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  scaValue: {
    fontFamily: FONTS.sansBold,
    fontSize: 12,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  tagChip: {
    backgroundColor: colors.panelRecessed,
    borderRadius: 4,
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  tagChipText: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 11,
    color: colors.textSecondary,
  },
  extraTagsText: {
    fontFamily: FONTS.sansRegular,
    fontSize: 11,
    color: colors.textMuted,
  },
  notesText: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});
