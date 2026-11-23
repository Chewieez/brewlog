import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Star } from 'lucide-react-native';
import {
  TastingLog,
  formatDisplayDate,
  getScaTierInfo,
  ScaTierKey,
} from '@brewlog/core';
import { makeStyles, useTheme, ThemeColors } from '@brewlog/ui';
import { useOptionalSettings } from '../../settings/SettingsContext';
import { FONTS } from '../../../theme/fonts';

export interface ReviewCardProps {
  review: TastingLog;
  onPress: (review: TastingLog) => void;
}

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
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  }
  return `${secs}s`;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({ review, onPress }) => {
  const styles = useStyles();
  const { colors } = useTheme();
  const settingsContext = useOptionalSettings();
  const dateFormat = settingsContext?.settings.dateFormat ?? 'locale';
  const formattedDate = review.brewDate
    ? formatDisplayDate(review.brewDate, dateFormat)
    : '';

  const scaScore = Number(review.calculatedScaScore ?? 0);
  const tier = getScaTierInfo(scaScore);
  const tierColor = getTierColor(tier.key, colors);
  const trimmedNotes = review.notes?.trim() ?? '';

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => onPress(review)}
      accessibilityRole="button"
      accessibilityLabel={`Review for ${review.beanNameSnapshot}`}
    >
      {/* 1. Header Row: Star Rating & SCA Score + Tier Badge */}
      <View testID="review-card-header" style={styles.headerRow}>
        <View style={styles.ratingBadge}>
          <Star size={14} color={colors.accent} fill={colors.accent} />
          <Text style={styles.ratingValueText}>{review.rating || '—'}</Text>
        </View>

        <View style={styles.scaRow}>
          <Text style={styles.scaValue}>{scaScore.toFixed(1)}</Text>
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
              {tier.label}
            </Text>
          </View>
        </View>
      </View>

      {/* 2. Identity: Coffee Name & Roaster */}
      <View testID="review-card-identity" style={styles.titleSection}>
        <Text style={styles.coffeeName} numberOfLines={1}>
          {review.beanNameSnapshot}
        </Text>
        <Text style={styles.roasterText} numberOfLines={1}>
          {review.roasterSnapshot}
        </Text>
      </View>

      {/* 3. Flavor Tags */}
      {review.flavorTags && review.flavorTags.length > 0 && (
        <View testID="review-card-tags" style={styles.tagsContainer}>
          {review.flavorTags.slice(0, 3).map((tag) => (
            <View key={`tag-${tag}`} style={styles.tagChip}>
              <Text style={styles.tagChipText}>{tag}</Text>
            </View>
          ))}
          {review.flavorTags.length > 3 && (
            <Text style={styles.extraTagsText}>
              +{review.flavorTags.length - 3}
            </Text>
          )}
        </View>
      )}

      {/* 4. Notes Snippet */}
      {trimmedNotes ? (
        <Text
          testID="review-card-notes"
          style={styles.notesText}
          numberOfLines={2}
        >
          {trimmedNotes}
        </Text>
      ) : null}

      {/* 5. Telemetry Footer */}
      <View testID="review-card-footer" style={styles.footerRow}>
        <View style={styles.footerLeft}>
          <View style={styles.methodBadge}>
            <Text style={styles.methodBadgeText}>
              {review.brewMethod.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.telemetryDot}>•</Text>
          <Text style={styles.specsText}>
            {review.coffeeDoseGrams}g:{review.waterAmountGrams}g
          </Text>
          {review.actualTimeSeconds ? (
            <>
              <Text style={styles.telemetryDot}>•</Text>
              <Text style={styles.specsText}>
                {formatBrewDuration(review.actualTimeSeconds)}
              </Text>
            </>
          ) : null}
        </View>
        {formattedDate ? (
          <Text style={styles.dateText}>{formattedDate}</Text>
        ) : null}
      </View>
    </Pressable>
  );
};

const useStyles = makeStyles((colors) => ({
  card: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 12,
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
    alignItems: 'center',
    gap: 8,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingValueText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 12,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  scaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scaValue: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 14,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  tierBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 7,
  },
  tierBadgeText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 10,
  },
  titleSection: {
    gap: 2,
  },
  coffeeName: {
    fontFamily: FONTS.displayBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  roasterText: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
    color: colors.textSecondary,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  tagChip: {
    backgroundColor: `${colors.accent}18`,
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderWidth: 1,
    borderColor: `${colors.accent}35`,
  },
  tagChipText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: colors.accent,
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
    lineHeight: 17,
    marginTop: 2,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  methodBadge: {
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 7,
  },
  methodBadgeText: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    color: colors.accent,
    letterSpacing: 0.8,
  },
  telemetryDot: {
    fontFamily: FONTS.sansRegular,
    fontSize: 11,
    color: colors.textMuted,
  },
  specsText: {
    fontFamily: FONTS.sansMedium,
    fontSize: 11,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  dateText: {
    fontFamily: FONTS.sansRegular,
    fontSize: 11,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
}));
