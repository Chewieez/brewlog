import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { X } from 'lucide-react-native';
import { SCA_FLAVOR_WHEEL, INDUSTRIAL_PRECISION_THEME } from '@brewlog/core';
import { FONTS } from '../../../theme/fonts';
import { ScaFlavorWheelSvg } from './ScaFlavorWheelSvg';

const { colors } = INDUSTRIAL_PRECISION_THEME;

export interface FlavorTagSelectorProps {
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
}

export const FlavorTagSelector: React.FC<FlavorTagSelectorProps> = ({
  selectedTags,
  onToggleTag,
}) => {
  const [mode, setMode] = useState<'tags' | 'wheel'>('tags');

  return (
    <View style={styles.container}>
      {/* Mode Switcher */}
      <View style={styles.modeSwitcher}>
        <Pressable
          style={[styles.modeTab, mode === 'tags' && styles.modeTabActive]}
          onPress={() => setMode('tags')}
          accessibilityRole="button"
          accessibilityLabel="Switch to tag list mode"
        >
          <Text style={[styles.modeTabText, mode === 'tags' && styles.modeTabTextActive]}>
            TAG LIST
          </Text>
        </Pressable>
        <Pressable
          style={[styles.modeTab, mode === 'wheel' && styles.modeTabActive]}
          onPress={() => setMode('wheel')}
          accessibilityRole="button"
          accessibilityLabel="Switch to sensory wheel mode"
        >
          <Text style={[styles.modeTabText, mode === 'wheel' && styles.modeTabTextActive]}>
            SENSORY WHEEL
          </Text>
        </Pressable>
      </View>

      {/* Selected Tags Chips Row */}
      {selectedTags.length > 0 && (
        <View style={styles.selectedRow}>
          <Text style={styles.selectedLabel}>SELECTED ({selectedTags.length}):</Text>
          <View style={styles.selectedChips}>
            {selectedTags.map((tag) => (
              <Pressable
                key={`selected-${tag}`}
                style={styles.selectedChip}
                onPress={() => onToggleTag(tag)}
                accessibilityRole="button"
                accessibilityLabel={`Remove tag ${tag}`}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.selectedChipText}>{tag}</Text>
                <X size={12} color={colors.accent} />
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Mode Content */}
      {mode === 'tags' ? (
        <View style={styles.tagCategoriesContainer}>
          {SCA_FLAVOR_WHEEL.map((cat) => {
            const descs = cat.subcategories?.flatMap((sub) => sub.descriptors || []) || [];
            return (
              <View key={`cat-group-${cat.name}`} style={styles.catGroup}>
                <View style={styles.catHeader}>
                  <View style={[styles.catColorDot, { backgroundColor: cat.color }]} />
                  <Text style={styles.catTitle}>{cat.name}</Text>
                </View>
                <View style={styles.chipsContainer}>
                  {descs.map((desc) => {
                    const isSelected = selectedTags.includes(desc);
                    return (
                      <Pressable
                        key={`chip-${desc}`}
                        style={[
                          styles.chip,
                          isSelected && [styles.chipSelected, { borderColor: cat.color }],
                        ]}
                        onPress={() => onToggleTag(desc)}
                        accessibilityRole="button"
                        accessibilityLabel={`Toggle flavor tag ${desc}`}
                        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            isSelected && { color: cat.color, fontFamily: FONTS.monoBold },
                          ]}
                        >
                          {desc}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <ScaFlavorWheelSvg
          selectedTags={selectedTags}
          onToggleTag={onToggleTag}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  modeSwitcher: {
    flexDirection: 'row',
    backgroundColor: colors.panelRecessed,
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
    minHeight: 40,
    justifyContent: 'center',
  },
  modeTabActive: {
    backgroundColor: colors.panel,
  },
  modeTabText: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 1.2,
  },
  modeTabTextActive: {
    color: colors.accent,
  },
  selectedRow: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 8,
    padding: 10,
    gap: 6,
  },
  selectedLabel: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  selectedChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  selectedChipText: {
    fontFamily: FONTS.monoMedium,
    fontSize: 11,
    color: colors.textPrimary,
  },
  tagCategoriesContainer: {
    gap: 12,
  },
  catGroup: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  catHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  catColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  catTitle: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    minHeight: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipSelected: {
    backgroundColor: colors.panel,
    borderWidth: 1.5,
  },
  chipText: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
    color: colors.textPrimary,
  },
});
