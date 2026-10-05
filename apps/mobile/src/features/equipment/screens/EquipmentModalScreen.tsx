import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { X, Check, Star, Trash2 } from 'lucide-react-native';
import {
  Equipment,
  EquipmentType,
  GrinderSettingScale,
  INDUSTRIAL_PRECISION_THEME,
} from '@brewlog/core';
import { useEquipment } from '../EquipmentContext';
import { FONTS } from '../../../theme/fonts';

const { colors } = INDUSTRIAL_PRECISION_THEME;

export interface EquipmentModalScreenProps {
  equipmentId?: string;
}

interface CategoryOption {
  label: string;
  value: EquipmentType;
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  { label: 'Grinder', value: 'grinder' },
  { label: 'Brewer', value: 'brewer' },
  { label: 'Scale', value: 'scale' },
  { label: 'Kettle', value: 'kettle' },
  { label: 'Other', value: 'other' },
];

interface SettingScaleOption {
  label: string;
  value: GrinderSettingScale;
}

const SCALE_TYPE_OPTIONS: SettingScaleOption[] = [
  { label: 'Stepped Numbers', value: 'stepped-numbers' },
  { label: 'Clicks', value: 'clicks' },
  { label: 'Stepless', value: 'stepless' },
  { label: 'Microns', value: 'microns' },
];

interface EquipmentModalFormProps {
  id: string;
  sourceItem?: Equipment;
}

const EquipmentModalForm: React.FC<EquipmentModalFormProps> = ({ id, sourceItem }) => {
  const router = useRouter();
  const { addEquipment, updateEquipment, deleteEquipment } = useEquipment();
  const isEditMode = Boolean(sourceItem);

  // Form field states
  const [type, setType] = useState<EquipmentType>(sourceItem?.type ?? 'grinder');
  const [brand, setBrand] = useState<string>(sourceItem?.brand ?? '');
  const [model, setModel] = useState<string>(sourceItem?.model ?? '');
  const [subType, setSubType] = useState<string>(sourceItem?.subType ?? '');
  const [settingScaleType, setSettingScaleType] = useState<GrinderSettingScale>(
    sourceItem?.settingScaleType ?? 'stepped-numbers'
  );
  const [isFavorite, setIsFavorite] = useState<boolean>(sourceItem?.isFavorite ?? false);
  const [notes, setNotes] = useState<string>(sourceItem?.notes ?? '');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initial values for clean/dirty check
  const initialValues = useMemo(
    () => ({
      type: sourceItem?.type ?? 'grinder',
      brand: sourceItem?.brand ?? '',
      model: sourceItem?.model ?? '',
      subType: sourceItem?.subType ?? '',
      settingScaleType: sourceItem?.settingScaleType ?? 'stepped-numbers',
      isFavorite: sourceItem?.isFavorite ?? false,
      notes: sourceItem?.notes ?? '',
    }),
    [sourceItem]
  );

  const isDirty =
    type !== initialValues.type ||
    brand !== initialValues.brand ||
    model !== initialValues.model ||
    subType !== initialValues.subType ||
    settingScaleType !== initialValues.settingScaleType ||
    isFavorite !== initialValues.isFavorite ||
    notes !== initialValues.notes;

  const handleCancel = () => {
    if (isDirty) {
      Alert.alert(
        'Discard Changes?',
        'Any unsaved equipment details will be lost.',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => router.back() },
        ]
      );
    } else {
      router.back();
    }
  };

  const handleSave = async () => {
    const trimmedBrand = brand.trim();
    if (!trimmedBrand) {
      setErrorMessage('Brand name is required');
      return;
    }

    const trimmedModel = model.trim();
    if (!trimmedModel) {
      setErrorMessage('Model name is required');
      return;
    }

    setErrorMessage(null);

    const payload = {
      type,
      brand: trimmedBrand,
      model: trimmedModel,
      subType: subType.trim() || undefined,
      settingScaleType: type === 'grinder' ? settingScaleType : undefined,
      isFavorite,
      notes: notes.trim() || undefined,
    };

    try {
      if (sourceItem) {
        await updateEquipment(sourceItem.id, payload);
      } else {
        await addEquipment(payload);
      }
      router.back();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save equipment.';
      setErrorMessage(msg);
      Alert.alert('Save Failed', msg);
    }
  };

  const handleDelete = () => {
    if (!sourceItem) return;

    Alert.alert(
      'Delete Equipment',
      `Are you sure you want to remove ${sourceItem.brand} ${sourceItem.model} from your gear?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEquipment(sourceItem.id);
              router.back();
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : 'Failed to delete equipment.';
              Alert.alert('Delete Failed', msg);
            }
          },
        },
      ]
    );
  };

  const getSubtypeLabel = () => {
    switch (type) {
      case 'grinder':
        return 'BURR / MECHANISM TYPE';
      case 'brewer':
        return 'BREWING METHOD / CATEGORY';
      case 'scale':
        return 'FEATURES / RESOLUTION';
      case 'kettle':
        return 'KETTLE FEATURES / SPOUT';
      case 'other':
        return 'EQUIPMENT TYPE / FEATURES';
      default:
        return 'SUBTYPE';
    }
  };

  const getSubtypePlaceholder = () => {
    switch (type) {
      case 'grinder':
        return 'e.g. 64mm Flat Burrs, Conical Burrs';
      case 'brewer':
        return 'e.g. Pour-Over, Immersion, Lever Espresso';
      case 'scale':
        return 'e.g. 0.1g Smart Scale, Auto-Timer';
      case 'kettle':
        return 'e.g. Variable Temp Gooseneck, Stovetop';
      case 'other':
        return 'e.g. WDT Tool, Refractometer, RDT Spray';
      default:
        return 'e.g. Specifications';
    }
  };

  const getBrandPlaceholder = () => {
    switch (type) {
      case 'grinder':
        return 'e.g. Fellow, Comandante, Baratza';
      case 'brewer':
        return 'e.g. Hario, Kalita, AeroPress, Flair';
      case 'scale':
        return 'e.g. Timemore, Acaia, Felicita';
      case 'kettle':
        return 'e.g. Fellow, Bonavita, Brewista';
      case 'other':
        return 'e.g. Subminimal, SworksDesign, Normcore';
      default:
        return 'e.g. Brand';
    }
  };

  const getModelPlaceholder = () => {
    switch (type) {
      case 'grinder':
        return 'e.g. Ode Gen 2, C40 MK4, Encore';
      case 'brewer':
        return 'e.g. V60 02, Aeropress, Kalita Wave';
      case 'scale':
        return 'e.g. Black Mirror Basic 2, Lunar';
      case 'kettle':
        return 'e.g. Stagg EKG (0.9L)';
      case 'other':
        return 'e.g. Flick WDT, Dipper, Blind Shaker';
      default:
        return 'e.g. Model Name';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Pinned Navigation Header */}
      <View style={styles.headerContainer}>
        <View style={styles.dragHandleContainer}>
          <View style={styles.dragHandle} />
        </View>
        <View style={styles.navHeader}>
          <Pressable
            onPress={handleCancel}
            style={styles.navButton}
            accessibilityRole="button"
            accessibilityLabel="Cancel editing"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={20} color={colors.textSecondary} />
          </Pressable>

          <Text style={styles.navTitle}>
            {isEditMode ? 'EDIT EQUIPMENT' : 'NEW EQUIPMENT'}
          </Text>

          <Pressable
            onPress={handleSave}
            style={styles.saveButton}
            accessibilityRole="button"
            accessibilityLabel="Save Equipment"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Check size={16} color={colors.canvas} />
            <Text style={styles.saveButtonText}>SAVE</Text>
          </Pressable>
        </View>
      </View>

      <KeyboardAwareScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        bottomOffset={32}
        keyboardShouldPersistTaps="handled"
      >

        {/* Validation / Error Banner */}
        {errorMessage ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* Equipment Category Selector */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>EQUIPMENT CATEGORY</Text>
          <View style={styles.categoryRow}>
            {CATEGORY_OPTIONS.map((cat) => {
              const isSelected = type === cat.value;
              return (
                <Pressable
                  key={cat.value}
                  onPress={() => setType(cat.value)}
                  style={[
                    styles.categoryPill,
                    isSelected ? styles.categoryPillActive : styles.categoryPillInactive,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`Select ${cat.label}`}
                >
                  <Text
                    style={[
                      styles.categoryPillText,
                      isSelected ? styles.categoryPillTextActive : styles.categoryPillTextInactive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Identity & Specs */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>SPECIFICATIONS</Text>

          <Text style={styles.fieldLabel}>BRAND NAME *</Text>
          <TextInput
            value={brand}
            onChangeText={setBrand}
            placeholder={getBrandPlaceholder()}
            placeholderTextColor={colors.textMuted}
            style={styles.textInput}
            accessibilityLabel="Brand Name"
          />

          <Text style={styles.fieldLabel}>MODEL NAME *</Text>
          <TextInput
            value={model}
            onChangeText={setModel}
            placeholder={getModelPlaceholder()}
            placeholderTextColor={colors.textMuted}
            style={styles.textInput}
            accessibilityLabel="Model Name"
          />

          <Text style={styles.fieldLabel}>{getSubtypeLabel()}</Text>
          <TextInput
            value={subType}
            onChangeText={setSubType}
            placeholder={getSubtypePlaceholder()}
            placeholderTextColor={colors.textMuted}
            style={styles.textInput}
            accessibilityLabel={getSubtypeLabel()}
          />

          {type === 'grinder' && (
            <View style={styles.subFieldContainer}>
              <Text style={styles.fieldLabel}>DIAL SETTING FORMAT</Text>
              <View style={styles.scaleTypeRow}>
                {SCALE_TYPE_OPTIONS.map((scaleOpt) => {
                  const isSelected = settingScaleType === scaleOpt.value;
                  return (
                    <Pressable
                      key={scaleOpt.value}
                      onPress={() => setSettingScaleType(scaleOpt.value)}
                      style={[
                        styles.scaleTypePill,
                        isSelected
                          ? styles.scaleTypePillActive
                          : styles.scaleTypePillInactive,
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={`Format ${scaleOpt.label}`}
                    >
                      <Text
                        style={[
                          styles.scaleTypePillText,
                          isSelected
                            ? styles.scaleTypePillTextActive
                            : styles.scaleTypePillTextInactive,
                        ]}
                      >
                        {scaleOpt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* Favorite Toggle */}
          <Pressable
            onPress={() => setIsFavorite(!isFavorite)}
            style={styles.favoriteRow}
            accessibilityRole="button"
            accessibilityLabel={isFavorite ? 'Unmark Favorite' : 'Mark as Favorite'}
          >
            <View style={styles.favoriteLabelContainer}>
              <Star
                size={18}
                color={isFavorite ? colors.accent : colors.textMuted}
                fill={isFavorite ? colors.accent : 'none'}
              />
              <Text style={styles.favoriteLabel}>Mark as Favorite Gear</Text>
            </View>
            <View
              style={[
                styles.togglePill,
                isFavorite ? styles.togglePillActive : styles.togglePillInactive,
              ]}
            >
              <Text
                style={[
                  styles.togglePillText,
                  isFavorite ? styles.togglePillTextActive : styles.togglePillTextInactive,
                ]}
              >
                {isFavorite ? 'FAVORITE' : 'OFF'}
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Notes */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>NOTES & CALIBRATION</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g. Preferred settings, burr upgrades, or calibration zero point"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
            style={[styles.textInput, styles.textArea]}
            accessibilityLabel="Notes"
          />
        </View>

        {/* Destructive Delete Button (Edit Mode) */}
        {isEditMode && (
          <View style={styles.deleteSection}>
            <Pressable
              onPress={handleDelete}
              style={styles.deleteButton}
              accessibilityRole="button"
              accessibilityLabel="Delete Equipment"
            >
              <Trash2 size={16} color={colors.statusError} />
              <Text style={styles.deleteButtonText}>DELETE EQUIPMENT</Text>
            </Pressable>
          </View>
        )}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

export const EquipmentModalScreen: React.FC<EquipmentModalScreenProps> = ({
  equipmentId,
}) => {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id =
    equipmentId ??
    (Array.isArray(params.id) ? params.id[0] : params.id) ??
    '';

  const { equipment, loading } = useEquipment();

  if (Boolean(id) && loading) {
    return (
      <SafeAreaView edges={['top']} style={[styles.safeArea, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.accent} testID="equipment-modal-loading" />
      </SafeAreaView>
    );
  }

  const sourceItem = id ? equipment.find((item) => item.id === id) : undefined;

  return (
    <EquipmentModalForm
      key={sourceItem ? sourceItem.id : (id || 'new')}
      id={id}
      sourceItem={sourceItem}
    />
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 16,
  },
  headerContainer: {
    backgroundColor: colors.canvas,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderSubtle,
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  navButton: {
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontFamily: FONTS.displayMedium,
    fontSize: 17,
    color: colors.textPrimary,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accent,
    paddingHorizontal: 14,
    minHeight: 36,
    borderRadius: 6,
    justifyContent: 'center',
  },
  saveButtonText: {
    fontFamily: FONTS.monoBold,
    fontSize: 12,
    color: colors.canvas,
    letterSpacing: 1,
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: colors.statusError,
    borderRadius: 8,
    padding: 12,
  },
  errorBannerText: {
    fontFamily: FONTS.sansMedium,
    fontSize: 13,
    color: colors.statusError,
  },
  sectionCard: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 8,
    padding: 16,
    gap: 10,
  },
  sectionHeader: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    color: colors.accent,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 6,
  },
  categoryPill: {
    flex: 1,
    minHeight: 38,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryPillActive: {
    backgroundColor: colors.panelRecessed,
    borderColor: colors.accent,
  },
  categoryPillInactive: {
    backgroundColor: colors.panel,
    borderColor: colors.borderSubtle,
  },
  categoryPillText: {
    fontFamily: FONTS.monoRegular,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  categoryPillTextActive: {
    fontFamily: FONTS.monoBold,
    color: colors.accent,
  },
  categoryPillTextInactive: {
    color: colors.textSecondary,
  },
  fieldLabel: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginTop: 4,
  },
  textInput: {
    fontFamily: FONTS.sansRegular,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 6,
    paddingHorizontal: 12,
    minHeight: 42,
  },
  textArea: {
    minHeight: 80,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  subFieldContainer: {
    gap: 6,
  },
  scaleTypeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  scaleTypePill: {
    flex: 1,
    minHeight: 36,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  scaleTypePillActive: {
    backgroundColor: colors.panelRecessed,
    borderColor: colors.accent,
  },
  scaleTypePillInactive: {
    backgroundColor: colors.panel,
    borderColor: colors.borderSubtle,
  },
  scaleTypePillText: {
    fontFamily: FONTS.monoRegular,
    fontSize: 10,
    textAlign: 'center',
  },
  scaleTypePillTextActive: {
    fontFamily: FONTS.monoBold,
    color: colors.accent,
  },
  scaleTypePillTextInactive: {
    color: colors.textSecondary,
  },
  favoriteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 6,
    paddingHorizontal: 12,
    minHeight: 44,
    marginTop: 8,
  },
  favoriteLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  favoriteLabel: {
    fontFamily: FONTS.sansMedium,
    fontSize: 13,
    color: colors.textPrimary,
  },
  togglePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
  togglePillActive: {
    backgroundColor: 'rgba(217, 119, 6, 0.15)',
    borderColor: colors.accent,
  },
  togglePillInactive: {
    backgroundColor: colors.panel,
    borderColor: colors.borderSubtle,
  },
  togglePillText: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  togglePillTextActive: {
    color: colors.accent,
  },
  togglePillTextInactive: {
    color: colors.textMuted,
  },
  deleteSection: {
    marginTop: 8,
    alignItems: 'center',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.statusError,
    borderRadius: 6,
    minHeight: 44,
    paddingHorizontal: 16,
    justifyContent: 'center',
    width: '100%',
  },
  deleteButtonText: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    color: colors.statusError,
    letterSpacing: 1,
  },
});
