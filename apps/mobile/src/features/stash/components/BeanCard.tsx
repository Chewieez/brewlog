import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';
import { Bean, INDUSTRIAL_PRECISION_THEME } from '@brewlog/core';
import { FONTS } from '../../../theme/fonts';
import { calculateBeanRestingInfo } from '../utils/restingUtils';

const { colors } = INDUSTRIAL_PRECISION_THEME;

export interface BeanCardProps {
  bean: Bean;
  onPress: (bean: Bean) => void;
  onBrew: (bean: Bean) => void;
  onToggleFavorite?: (bean: Bean) => void;
}

export const BeanCard: React.FC<BeanCardProps> = ({
  bean,
  onPress,
  onBrew,
  onToggleFavorite,
}) => {
  const restingInfo = calculateBeanRestingInfo(bean);
  const remaining = bean.remainingGrams ?? bean.bagWeightGrams ?? 0;
  const totalBag = bean.bagWeightGrams ?? remaining;
  const isLowWeight = bean.remainingGrams !== undefined && bean.remainingGrams < 40;
  const progressPercent =
    totalBag > 0
      ? Math.min(100, Math.max(0, Math.round((remaining / totalBag) * 100)))
      : 0;

  let weightDisplay = '--';
  if (bean.remainingGrams !== undefined && bean.bagWeightGrams !== undefined) {
    weightDisplay = `${bean.remainingGrams}g / ${bean.bagWeightGrams}g`;
  } else if (bean.remainingGrams !== undefined) {
    weightDisplay = `${bean.remainingGrams}g`;
  } else if (bean.bagWeightGrams !== undefined) {
    weightDisplay = `${bean.bagWeightGrams}g / ${bean.bagWeightGrams}g`;
  }

  const progressBarColor = isLowWeight
    ? colors.statusWarning
    : colors.statusSuccess;

  return (
    <Pressable
      onPress={() => onPress(bean)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={`View bean ${bean.name}`}
    >
      {/* Header Row: Roaster Eyebrow, Bean Name & Favorite Star Button */}
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <Text style={styles.roasterEyebrow}>{bean.roaster.toUpperCase()}</Text>
          <Text style={styles.beanName} numberOfLines={1}>
            {bean.name}
          </Text>
        </View>

        <Pressable
          onPress={() => onToggleFavorite?.(bean)}
          disabled={!onToggleFavorite}
          accessibilityState={{ disabled: !onToggleFavorite }}
          style={({ pressed }) => [
            styles.favoriteButton,
            pressed && styles.buttonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={
            bean.isFavorite ? 'Remove from favorites' : 'Add to favorites'
          }
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Star
            size={20}
            color={bean.isFavorite ? colors.accent : colors.textMuted}
            fill={bean.isFavorite ? colors.accent : 'none'}
          />
        </Pressable>
      </View>

      {/* Badges Row: Resting Status, Origin Country, Process, Roast Level */}
      <View style={styles.badgeGroup}>
        <View style={[styles.badge, { borderColor: restingInfo.badgeColor }]}>
          <Text
            style={[styles.restingBadgeText, { color: restingInfo.badgeColor }]}
          >
            {restingInfo.badgeLabel}
          </Text>
        </View>

        {bean.originCountry ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{bean.originCountry}</Text>
          </View>
        ) : null}

        {bean.process ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{bean.process}</Text>
          </View>
        ) : null}

        {bean.roastLevel ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{bean.roastLevel}</Text>
          </View>
        ) : null}
      </View>

      {/* Flavor Notes (if present) */}
      {bean.flavorNotes && bean.flavorNotes.length > 0 ? (
        <Text style={styles.flavorNotesText} numberOfLines={1}>
          {bean.flavorNotes.join(' · ')}
        </Text>
      ) : null}

      {/* Footer Row: Remaining Weight & Progress Bar + BREW Action Button */}
      <View style={styles.footerRow}>
        <View style={styles.weightContainer}>
          <View style={styles.weightLabelRow}>
            <Text style={styles.weightLabel}>REMAINING</Text>
            <Text
              style={[
                styles.weightValue,
                isLowWeight && styles.weightValueWarning,
              ]}
            >
              {weightDisplay}
            </Text>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progressPercent}%`,
                  backgroundColor: progressBarColor,
                },
              ]}
            />
          </View>
        </View>

        <Pressable
          onPress={() => onBrew(bean)}
          style={({ pressed }) => [
            styles.brewButton,
            pressed && styles.buttonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Brew with ${bean.name}`}
        >
          <Text style={styles.brewButtonText}>BREW</Text>
        </Pressable>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.panel,
    borderColor: colors.borderSubtle,
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    gap: 12,
    minHeight: 44,
  },
  cardPressed: {
    opacity: 0.85,
    borderColor: colors.accent,
  },
  buttonPressed: {
    opacity: 0.75,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  titleContainer: {
    flex: 1,
  },
  roasterEyebrow: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    color: colors.accent,
    letterSpacing: 1.2,
  },
  beanName: {
    fontFamily: FONTS.sansBold,
    fontSize: 18,
    color: colors.textPrimary,
    marginTop: 2,
  },
  favoriteButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -8,
    marginRight: -8,
  },
  badgeGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  badge: {
    backgroundColor: colors.panelRecessed,
    borderColor: colors.borderSubtle,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontFamily: FONTS.monoRegular,
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  restingBadgeText: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  flavorNotesText: {
    fontFamily: FONTS.sansRegular,
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    marginTop: 4,
  },
  weightContainer: {
    flex: 1,
    gap: 6,
  },
  weightLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  weightLabel: {
    fontFamily: FONTS.monoRegular,
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  weightValue: {
    fontFamily: FONTS.monoBold,
    fontSize: 12,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  weightValueWarning: {
    color: colors.statusWarning,
  },
  progressTrack: {
    height: 4,
    backgroundColor: colors.panelRecessed,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  brewButton: {
    backgroundColor: colors.accent,
    borderRadius: 6,
    minHeight: 44,
    minWidth: 72,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brewButtonText: {
    fontFamily: FONTS.monoBold,
    fontSize: 12,
    color: colors.canvas,
    letterSpacing: 1,
  },
});
