import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { INDUSTRIAL_PRECISION_THEME, BrewSplit, SplitTag } from '@brewlog/core';
import { FONTS } from '../../theme/fonts';

const { colors } = INDUSTRIAL_PRECISION_THEME;

export interface FreeBrewSplitTimelineProps {
  splits: BrewSplit[];
  onRemoveSplit?: (id: string) => void;
  readOnly?: boolean;
}

const formatSplitTime = (second: number): string => {
  const min = Math.floor(second / 60);
  const sec = second % 60;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

const getTagColor = (tag?: SplitTag): string => {
  switch (tag) {
    case 'bloom':
      return colors.accent;
    case 'pour':
      return colors.statusInfo;
    case 'drawdown':
      return colors.statusWarning;
    default:
      return colors.textSecondary;
  }
};

export const FreeBrewSplitTimeline: React.FC<FreeBrewSplitTimelineProps> = ({
  splits,
  onRemoveSplit,
  readOnly = false,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>RECORDED SPLITS</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{splits.length}</Text>
        </View>
      </View>

      {splits.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No splits recorded yet</Text>
          <Text style={styles.emptySubtitle}>
            Tap SPLIT during brewing to record timestamps and intervals.
          </Text>
        </View>
      ) : (
        <View style={styles.timelineList}>
          {splits.map((split, idx) => {
            const tagColor = getTagColor(split.tag);
            const tagLabel = (split.tag || 'custom').toUpperCase();

            return (
              <View key={split.id || idx} style={styles.splitCard}>
                <View style={styles.splitLeft}>
                  <Text style={styles.splitIndex}>#{idx + 1}</Text>
                </View>

                <View style={styles.splitCenter}>
                  <View style={styles.splitTopRow}>
                    <View style={[styles.tagBadge, { borderColor: tagColor }]}>
                      <Text style={[styles.tagBadgeText, { color: tagColor }]}>
                        {tagLabel}
                      </Text>
                    </View>
                    <Text style={styles.splitLabel} numberOfLines={1}>
                      {split.label}
                    </Text>
                  </View>

                  <View style={styles.splitBottomRow}>
                    <Text style={styles.timestampText}>
                      {formatSplitTime(split.second)}
                    </Text>
                    <Text style={styles.intervalText}>
                      +{split.intervalSeconds}s
                    </Text>
                  </View>
                </View>

                {!readOnly && onRemoveSplit ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Delete split ${split.label}`}
                    onPress={() => onRemoveSplit(split.id)}
                    hitSlop={8}
                    style={styles.deleteButton}
                  >
                    <Trash2 size={16} color={colors.textMuted} />
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

export const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: colors.textMuted,
    fontSize: 10,
    fontFamily: FONTS.monoBold,
    letterSpacing: 1.5,
  },
  countBadge: {
    backgroundColor: colors.panelRecessed,
    borderColor: colors.borderSubtle,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countBadgeText: {
    color: colors.accent,
    fontSize: 10,
    fontFamily: FONTS.monoBold,
  },
  emptyCard: {
    backgroundColor: colors.panel,
    borderColor: colors.borderSubtle,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    color: colors.textSecondary,
    fontSize: 13,
    fontFamily: FONTS.sansSemiBold,
  },
  emptySubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontFamily: FONTS.sansRegular,
    textAlign: 'center',
    lineHeight: 17,
  },
  timelineList: {
    gap: 8,
  },
  splitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.panel,
    borderColor: colors.borderSubtle,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 10,
  },
  splitLeft: {
    width: 26,
    alignItems: 'center',
  },
  splitIndex: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: FONTS.monoMedium,
  },
  splitCenter: {
    flex: 1,
    gap: 4,
  },
  splitTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tagBadge: {
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  tagBadgeText: {
    fontSize: 9,
    fontFamily: FONTS.monoBold,
    letterSpacing: 0.8,
  },
  splitLabel: {
    color: colors.textPrimary,
    fontSize: 13,
    fontFamily: FONTS.sansMedium,
    flexShrink: 1,
  },
  splitBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timestampText: {
    color: colors.accent,
    fontSize: 12,
    fontFamily: FONTS.monoBold,
  },
  intervalText: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: FONTS.monoRegular,
  },
  deleteButton: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default FreeBrewSplitTimeline;
