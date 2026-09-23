import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Bean, INDUSTRIAL_PRECISION_THEME } from '@brewlog/core';
import { useOptionalStash } from '../StashContext';
import { FONTS } from '../../../theme/fonts';

const { colors } = INDUSTRIAL_PRECISION_THEME;

export interface ActiveBeanPillProps {
  bean?: Bean | null;
  onDetach?: () => void;
}

export const ActiveBeanPill: React.FC<ActiveBeanPillProps> = ({
  bean: propBean,
  onDetach: propOnDetach,
}) => {
  const stash = useOptionalStash();
  const bean = propBean !== undefined ? propBean : stash?.activeBrewBean ?? null;
  const handleDetach =
    propOnDetach !== undefined
      ? propOnDetach
      : () => stash?.setActiveBrewBean(null);

  if (!bean) return null;

  const remainingGrams =
    bean.remainingGrams !== undefined
      ? bean.remainingGrams
      : bean.bagWeightGrams ?? 0;

  const handlePressDetach = () => {
    handleDetach();
  };

  return (
    <View style={styles.chassis}>
      <View style={styles.infoRow}>
        <View style={styles.textContainer}>
          <Text style={styles.pillText} numberOfLines={1}>
            <Text style={styles.roasterAndName}>
              🫘 {bean.roaster.toUpperCase()} • {bean.name}
            </Text>
            <Text style={styles.weight}> ({remainingGrams}g left)</Text>
          </Text>
        </View>
      </View>

      <Pressable
        onPress={handlePressDetach}
        style={({ pressed }) => [
          styles.detachButton,
          pressed && styles.detachButtonPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Detach active bean"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.detachIcon}>×</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  chassis: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: colors.panel,
    borderColor: colors.borderSubtle,
    borderWidth: 1,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 12,
    paddingRight: 4,
    minHeight: 44,
  },
  infoRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 4,
  },
  textContainer: {
    flex: 1,
  },
  pillText: {
    fontFamily: FONTS.monoRegular,
    fontSize: 12,
  },
  roasterAndName: {
    fontFamily: FONTS.monoBold,
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  weight: {
    fontFamily: FONTS.monoRegular,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  detachButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detachButtonPressed: {
    opacity: 0.7,
  },
  detachIcon: {
    fontFamily: FONTS.monoBold,
    fontSize: 20,
    color: colors.textMuted,
    lineHeight: 22,
  },
});
