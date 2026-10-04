import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';
import { Equipment, INDUSTRIAL_PRECISION_THEME } from '@brewlog/core';
import { FONTS } from '../../../theme/fonts';

const { colors } = INDUSTRIAL_PRECISION_THEME;

export interface EquipmentCardProps {
  equipment: Equipment;
  onPress: (item: Equipment) => void;
  onToggleFavorite?: (item: Equipment) => void;
}

export const EquipmentCard: React.FC<EquipmentCardProps> = ({
  equipment,
  onPress,
  onToggleFavorite,
}) => {
  return (
    <Pressable
      style={styles.card}
      onPress={() => onPress(equipment)}
      accessibilityRole="button"
      accessibilityLabel={`${equipment.brand} ${equipment.model}`}
    >
      <View style={styles.headerRow}>
        <Text style={styles.brandText}>{equipment.brand}</Text>
        <View style={styles.badgesRow}>
          {equipment.settingScaleType && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{equipment.settingScaleType}</Text>
            </View>
          )}
          {equipment.subType && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{equipment.subType}</Text>
            </View>
          )}
          {onToggleFavorite && (
            <Pressable
              onPress={(e) => {
                e?.stopPropagation?.();
                onToggleFavorite(equipment);
              }}
              style={styles.starButton}
              accessibilityRole="button"
              accessibilityLabel={equipment.isFavorite ? 'Unfavorite equipment' : 'Favorite equipment'}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Star
                size={18}
                color={equipment.isFavorite ? colors.accent : colors.textMuted}
                fill={equipment.isFavorite ? colors.accent : 'none'}
              />
            </Pressable>
          )}
        </View>
      </View>

      <Text style={styles.modelText}>{equipment.model}</Text>

      {equipment.notes ? (
        <Text style={styles.notesText} numberOfLines={2}>
          {equipment.notes}
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
    gap: 6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandText: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    color: colors.accent,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontFamily: FONTS.monoRegular,
    fontSize: 10,
    color: colors.textSecondary,
  },
  starButton: {
    padding: 2,
  },
  modelText: {
    fontFamily: FONTS.sansBold,
    fontSize: 16,
    color: colors.textPrimary,
  },
  notesText: {
    fontFamily: FONTS.sansRegular,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
    marginTop: 2,
  },
});
