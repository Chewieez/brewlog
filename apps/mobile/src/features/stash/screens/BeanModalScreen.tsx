import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
  StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Check, Snowflake } from 'lucide-react-native';
import {
  Bean,
  ProcessMethod,
  RoastLevel,
  INDUSTRIAL_PRECISION_THEME,
} from '@brewlog/core';
import { useStash, AddBeanInput } from '../StashContext';
import { FONTS } from '../../../theme/fonts';

const { colors } = INDUSTRIAL_PRECISION_THEME;

export function normalizeRoastDate(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  // ISO: YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(trimmed);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, '0');
    const d = isoMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // American format: MM-DD-YYYY or MM/DD/YYYY
  const usMatch = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(trimmed);
  if (usMatch) {
    const m = usMatch[1].padStart(2, '0');
    const d = usMatch[2].padStart(2, '0');
    const y = usMatch[3];
    return `${y}-${m}-${d}`;
  }

  return trimmed;
}

export interface BeanModalScreenProps {
  beanId?: string;
}

interface ProcessOption {
  label: string;
  value: ProcessMethod;
}

const PROCESS_OPTIONS: ProcessOption[] = [
  { label: 'Washed', value: 'washed' },
  { label: 'Natural', value: 'natural' },
  { label: 'Honey', value: 'honey' },
  { label: 'Anaerobic', value: 'anaerobic-natural' },
  { label: 'Anaerobic Washed', value: 'anaerobic-washed' },
  { label: 'Carbonic', value: 'carbonic-maceration' },
  { label: 'Wet Hulled', value: 'wet-hulled' },
  { label: 'Experimental', value: 'experimental' },
  { label: 'Other', value: 'other' },
];

interface RoastOption {
  label: string;
  value: RoastLevel;
}

const ROAST_LEVEL_OPTIONS: RoastOption[] = [
  { label: 'Light', value: 'light' },
  { label: 'Light-Medium', value: 'light-medium' },
  { label: 'Medium', value: 'medium' },
  { label: 'Medium-Dark', value: 'medium-dark' },
  { label: 'Dark', value: 'dark' },
];

interface BagPreset {
  label: string;
  value: number;
}

const BAG_PRESETS: BagPreset[] = [
  { label: '250g', value: 250 },
  { label: '340g', value: 340 },
  { label: '1kg', value: 1000 },
];

export const BeanModalScreen: React.FC<BeanModalScreenProps> = ({ beanId }) => {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[]; editId?: string | string[] }>();
  const id =
    beanId ??
    (Array.isArray(params.id) ? params.id[0] : params.id) ??
    (Array.isArray(params.editId) ? params.editId[0] : params.editId) ??
    '';

  const { beans, addBean, updateBean } = useStash();
  const sourceBean: Bean | undefined = id ? beans.find((b) => b.id === id) : undefined;
  const isEditMode = Boolean(sourceBean);

  // Form field states
  const [roaster, setRoaster] = useState<string>(sourceBean?.roaster ?? '');
  const [name, setName] = useState<string>(sourceBean?.name ?? '');
  const [originCountry, setOriginCountry] = useState<string>(sourceBean?.originCountry ?? '');
  const [region, setRegion] = useState<string>(sourceBean?.region ?? '');
  const [farm, setFarm] = useState<string>(sourceBean?.farm ?? '');
  const [varietyText, setVarietyText] = useState<string>(
    sourceBean?.variety ? sourceBean.variety.join(', ') : ''
  );
  const [altitudeText, setAltitudeText] = useState<string>(
    sourceBean?.altitudeMeters !== undefined ? String(sourceBean.altitudeMeters) : ''
  );
  const [processMethod, setProcessMethod] = useState<ProcessMethod | undefined>(
    sourceBean?.process
  );
  const [roastLevel, setRoastLevel] = useState<RoastLevel | undefined>(
    sourceBean?.roastLevel
  );
  const [roastDate, setRoastDate] = useState<string>(sourceBean?.roastDate ?? '');
  const [restDaysText, setRestDaysText] = useState<string>(
    sourceBean?.recommendedRestDays !== undefined ? String(sourceBean.recommendedRestDays) : ''
  );
  const [bagWeightText, setBagWeightText] = useState<string>(
    sourceBean?.bagWeightGrams !== undefined ? String(sourceBean.bagWeightGrams) : ''
  );
  const [remainingWeightText, setRemainingWeightText] = useState<string>(
    sourceBean?.remainingGrams !== undefined ? String(sourceBean.remainingGrams) : ''
  );
  const [isFrozen, setIsFrozen] = useState<boolean>(sourceBean?.isFrozen ?? false);
  const [flavorNotesText, setFlavorNotesText] = useState<string>(
    sourceBean?.flavorNotes ? sourceBean.flavorNotes.join(', ') : ''
  );
  const [priceText, setPriceText] = useState<string>(
    sourceBean?.price !== undefined ? String(sourceBean.price) : ''
  );
  const [notes, setNotes] = useState<string>(sourceBean?.notes ?? '');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initial values for clean/dirty check
  const initialValues = useMemo(
    () => ({
      roaster: sourceBean?.roaster ?? '',
      name: sourceBean?.name ?? '',
      originCountry: sourceBean?.originCountry ?? '',
      region: sourceBean?.region ?? '',
      farm: sourceBean?.farm ?? '',
      variety: sourceBean?.variety ? sourceBean.variety.join(', ') : '',
      altitude: sourceBean?.altitudeMeters !== undefined ? String(sourceBean.altitudeMeters) : '',
      process: sourceBean?.process,
      roastLevel: sourceBean?.roastLevel,
      roastDate: sourceBean?.roastDate ?? '',
      restDays: sourceBean?.recommendedRestDays !== undefined ? String(sourceBean.recommendedRestDays) : '',
      bagWeight: sourceBean?.bagWeightGrams !== undefined ? String(sourceBean.bagWeightGrams) : '',
      remainingWeight: sourceBean?.remainingGrams !== undefined ? String(sourceBean.remainingGrams) : '',
      isFrozen: sourceBean?.isFrozen ?? false,
      flavorNotes: sourceBean?.flavorNotes ? sourceBean.flavorNotes.join(', ') : '',
      notes: sourceBean?.notes ?? '',
      price: sourceBean?.price !== undefined ? String(sourceBean.price) : '',
    }),
    [sourceBean]
  );

  const isDirty =
    roaster !== initialValues.roaster ||
    name !== initialValues.name ||
    originCountry !== initialValues.originCountry ||
    region !== initialValues.region ||
    farm !== initialValues.farm ||
    varietyText !== initialValues.variety ||
    altitudeText !== initialValues.altitude ||
    processMethod !== initialValues.process ||
    roastLevel !== initialValues.roastLevel ||
    roastDate !== initialValues.roastDate ||
    restDaysText !== initialValues.restDays ||
    bagWeightText !== initialValues.bagWeight ||
    remainingWeightText !== initialValues.remainingWeight ||
    isFrozen !== initialValues.isFrozen ||
    flavorNotesText !== initialValues.flavorNotes ||
    notes !== initialValues.notes ||
    priceText !== initialValues.price;

  const handleSave = async () => {
    const trimmedRoaster = roaster.trim();
    if (!trimmedRoaster) {
      setErrorMessage('Roaster is required');
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage('Coffee name is required');
      return;
    }

    setErrorMessage(null);

    const rawBagWeight = bagWeightText.trim() ? parseFloat(bagWeightText) : undefined;
    if (rawBagWeight !== undefined && !isNaN(rawBagWeight) && rawBagWeight < 0) {
      setErrorMessage('Bag weight cannot be negative');
      return;
    }

    const rawRemaining = remainingWeightText.trim()
      ? parseFloat(remainingWeightText)
      : undefined;
    if (rawRemaining !== undefined && !isNaN(rawRemaining) && rawRemaining < 0) {
      setErrorMessage('Remaining weight cannot be negative');
      return;
    }

    const parsedBagWeight =
      rawBagWeight !== undefined && !isNaN(rawBagWeight)
        ? Math.max(0, rawBagWeight)
        : undefined;

    const parsedRemaining =
      rawRemaining !== undefined && !isNaN(rawRemaining)
        ? Math.max(0, rawRemaining)
        : parsedBagWeight;

    const parsedAltitude = altitudeText.trim() ? parseInt(altitudeText, 10) : undefined;
    const parsedPrice = priceText.trim() ? parseFloat(priceText) : undefined;
    const parsedRestDays = restDaysText.trim() ? parseInt(restDaysText, 10) : 5;

    const varieties = varietyText
      .split(',')
      .map((v) => v.trim())
      .filter((v) => v.length > 0);

    const flavors = flavorNotesText
      .split(',')
      .map((f) => f.trim())
      .filter((f) => f.length > 0);

    const payload: AddBeanInput = {
      roaster: trimmedRoaster,
      name: trimmedName,
      originCountry: originCountry.trim() || undefined,
      region: region.trim() || undefined,
      farm: farm.trim() || undefined,
      variety: varieties.length > 0 ? varieties : undefined,
      altitudeMeters: isNaN(parsedAltitude ?? NaN) ? undefined : parsedAltitude,
      process: processMethod,
      roastLevel,
      roastDate: normalizeRoastDate(roastDate),
      recommendedRestDays: isNaN(parsedRestDays) ? 5 : Math.max(0, parsedRestDays),
      bagWeightGrams: parsedBagWeight,
      remainingGrams: parsedRemaining,
      isFrozen,
      frozenDate: isFrozen
        ? sourceBean?.frozenDate || new Date().toISOString().split('T')[0]
        : undefined,
      flavorNotes: flavors,
      price:
        parsedPrice !== undefined && !isNaN(parsedPrice)
          ? Math.max(0, parsedPrice)
          : undefined,
      notes: notes.trim() || undefined,
    };

    try {
      if (sourceBean) {
        await updateBean(sourceBean.id, payload);
      } else {
        await addBean(payload);
      }
      router.back();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save coffee bag.';
      setErrorMessage(msg);
      Alert.alert('Save Failed', msg);
    }
  };

  const handleCancel = () => {
    if (isDirty) {
      Alert.alert(
        'Discard Changes?',
        'Any unsaved coffee details will be lost.',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => router.back() },
        ]
      );
    } else {
      router.back();
    }
  };

  const handleSelectPreset = (value: number) => {
    setBagWeightText(String(value));
    if (!sourceBean || !remainingWeightText) {
      setRemainingWeightText(String(value));
    }
  };

  if (id && !sourceBean) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.notFoundContainer}>
          <Text style={styles.notFoundTitle}>Coffee Not Found</Text>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go Back"
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={true}
      >
      {/* Header with Cancel / Save */}
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
          {isEditMode ? 'EDIT COFFEE BAG' : 'NEW COFFEE BAG'}
        </Text>

        <Pressable
          onPress={handleSave}
          style={styles.saveButton}
          accessibilityRole="button"
          accessibilityLabel="Save Bag"
        >
          <Check size={18} color={colors.canvas} />
          <Text style={styles.saveButtonText}>SAVE BAG</Text>
        </Pressable>
      </View>

      {/* Validation / Error Banner */}
      {errorMessage ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{errorMessage}</Text>
        </View>
      ) : null}

      {/* Section 1: Required Details */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionHeader}>COFFEE IDENTITY</Text>

        <Text style={styles.fieldLabel}>ROASTER *</Text>
        <TextInput
          value={roaster}
          onChangeText={setRoaster}
          placeholder="e.g. Sey"
          placeholderTextColor={colors.textMuted}
          numberOfLines={1}
          style={styles.textInput}
        />

        <Text style={styles.fieldLabel}>COFFEE NAME *</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Worka Sakaro"
          placeholderTextColor={colors.textMuted}
          numberOfLines={1}
          style={styles.textInput}
        />
      </View>

      {/* Section 2: Origin & Production */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionHeader}>ORIGIN & TERROIR</Text>

        <View style={styles.fieldRow}>
          <View style={styles.fieldHalf}>
            <Text style={styles.fieldLabel}>ORIGIN COUNTRY</Text>
            <TextInput
              value={originCountry}
              onChangeText={setOriginCountry}
              placeholder="e.g. Ethiopia"
              placeholderTextColor={colors.textMuted}
              numberOfLines={1}
              style={styles.textInput}
            />
          </View>
          <View style={styles.fieldHalf}>
            <Text style={styles.fieldLabel}>REGION</Text>
            <TextInput
              value={region}
              onChangeText={setRegion}
              placeholder="e.g. Yirgacheffe"
              placeholderTextColor={colors.textMuted}
              numberOfLines={1}
              style={styles.textInput}
            />
          </View>
        </View>

        <Text style={styles.fieldLabel}>FARM / PRODUCER / MILL</Text>
        <TextInput
          value={farm}
          onChangeText={setFarm}
          placeholder="e.g. Finca El Paraiso"
          placeholderTextColor={colors.textMuted}
          numberOfLines={1}
          style={styles.textInput}
        />

        <View style={styles.fieldRow}>
          <View style={styles.fieldHalf}>
            <Text style={styles.fieldLabel}>VARIETY</Text>
            <TextInput
              value={varietyText}
              onChangeText={setVarietyText}
              placeholder="e.g. Gesha"
              placeholderTextColor={colors.textMuted}
              numberOfLines={1}
              style={styles.textInput}
            />
          </View>
          <View style={styles.fieldHalf}>
            <Text style={styles.fieldLabel}>ALTITUDE (METERS)</Text>
            <TextInput
              value={altitudeText}
              onChangeText={setAltitudeText}
              placeholder="e.g. 1950"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              numberOfLines={1}
              style={styles.textInput}
            />
          </View>
        </View>
      </View>

      {/* Section 3: Process & Roast */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionHeader}>PROCESSING & ROAST</Text>

        <Text style={styles.fieldLabel}>PROCESS METHOD</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {PROCESS_OPTIONS.map((opt) => {
            const isSelected = processMethod === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setProcessMethod(isSelected ? undefined : opt.value)}
                style={[
                  styles.chip,
                  isSelected ? styles.chipActive : styles.chipInactive,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`Process method ${opt.label}`}
              >
                <Text
                  style={[
                    styles.chipText,
                    isSelected ? styles.chipTextActive : styles.chipTextInactive,
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={styles.fieldLabel}>ROAST LEVEL</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {ROAST_LEVEL_OPTIONS.map((opt) => {
            const isSelected = roastLevel === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setRoastLevel(isSelected ? undefined : opt.value)}
                style={[
                  styles.chip,
                  isSelected ? styles.chipActive : styles.chipInactive,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`Roast level ${opt.label}`}
              >
                <Text
                  style={[
                    styles.chipText,
                    isSelected ? styles.chipTextActive : styles.chipTextInactive,
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.fieldRow}>
          <View style={styles.fieldHalf}>
            <Text style={styles.fieldLabel}>ROAST DATE</Text>
            <TextInput
              value={roastDate}
              onChangeText={setRoastDate}
              placeholder="MM-DD-YYYY"
              placeholderTextColor={colors.textMuted}
              numberOfLines={1}
              style={styles.textInput}
            />
          </View>
          <View style={styles.fieldHalf}>
            <Text style={styles.fieldLabel}>RECOMMENDED REST DAYS</Text>
            <TextInput
              value={restDaysText}
              onChangeText={setRestDaysText}
              placeholder="5"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              numberOfLines={1}
              style={styles.textInput}
            />
          </View>
        </View>
      </View>

      {/* Section 4: Inventory & Freezer */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionHeader}>INVENTORY & CELLAR</Text>

        <Text style={styles.fieldLabel}>BAG WEIGHT PRESETS</Text>
        <View style={styles.presetsRow}>
          {BAG_PRESETS.map((preset) => {
            const isSelected = bagWeightText === String(preset.value);
            return (
              <Pressable
                key={preset.value}
                onPress={() => handleSelectPreset(preset.value)}
                style={[
                  styles.presetChip,
                  isSelected ? styles.chipActive : styles.chipInactive,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`Preset ${preset.label}`}
              >
                <Text
                  style={[
                    styles.presetChipText,
                    isSelected ? styles.chipTextActive : styles.chipTextInactive,
                  ]}
                >
                  {preset.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.fieldRow}>
          <View style={styles.fieldHalf}>
            <Text style={styles.fieldLabel}>BAG WEIGHT (GRAMS)</Text>
            <TextInput
              value={bagWeightText}
              onChangeText={setBagWeightText}
              placeholder="250"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              numberOfLines={1}
              style={styles.textInput}
            />
          </View>
          <View style={styles.fieldHalf}>
            <Text style={styles.fieldLabel}>REMAINING (GRAMS)</Text>
            <TextInput
              value={remainingWeightText}
              onChangeText={setRemainingWeightText}
              placeholder="250"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              numberOfLines={1}
              style={styles.textInput}
            />
          </View>
        </View>

        {/* Freezer Vault Toggle */}
        <Pressable
          testID="freezer-vault-toggle"
          onPress={() => setIsFrozen((prev) => !prev)}
          style={[
            styles.toggleRow,
            isFrozen ? styles.toggleRowActive : styles.toggleRowInactive,
          ]}
          accessibilityRole="switch"
          accessibilityState={{ checked: isFrozen }}
          accessibilityLabel="Store in Freezer Vault"
        >
          <View style={styles.toggleLeft}>
            <Snowflake
              size={20}
              color={isFrozen ? colors.accent : colors.textMuted}
            />
            <View style={styles.toggleTextContainer}>
              <Text style={styles.toggleTitle}>FREEZER VAULT</Text>
              <Text style={styles.toggleSubtitle}>
                {isFrozen
                  ? 'Preserving freshness (aging paused)'
                  : 'Store bag in the sub-zero vault'}
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.switchTrack,
              isFrozen ? styles.switchTrackActive : styles.switchTrackInactive,
            ]}
          >
            <View
              style={[
                styles.switchThumb,
                isFrozen ? styles.switchThumbActive : styles.switchThumbInactive,
              ]}
            />
          </View>
        </Pressable>
      </View>

      {/* Section 5: Flavor & Notes */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionHeader}>TASTING & NOTES</Text>

        <Text style={styles.fieldLabel}>FLAVOR NOTES (COMMA-SEPARATED)</Text>
        <TextInput
          value={flavorNotesText}
          onChangeText={setFlavorNotesText}
          placeholder="e.g. Peach, Jasmine, Bergamot"
          placeholderTextColor={colors.textMuted}
          numberOfLines={1}
          style={styles.textInput}
        />

        <Text style={styles.fieldLabel}>PRICE ($)</Text>
        <TextInput
          value={priceText}
          onChangeText={setPriceText}
          placeholder="e.g. 24.00"
          placeholderTextColor={colors.textMuted}
          keyboardType="numeric"
          numberOfLines={1}
          style={styles.textInput}
        />

        <Text style={styles.fieldLabel}>NOTES & IMPRESSIONS</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Tasting notes, brew tips, impressions..."
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={3}
          style={[styles.textInput, styles.textArea]}
        />
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
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  content: {
    padding: 16,
    paddingBottom: 48,
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    marginBottom: 16,
  },
  navButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: colors.panel,
  },
  navTitle: {
    fontFamily: FONTS.monoBold,
    fontSize: 14,
    color: colors.textPrimary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  saveButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  saveButtonText: {
    fontFamily: FONTS.monoBold,
    fontSize: 12,
    color: colors.canvas,
    letterSpacing: 0.5,
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: colors.statusError,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
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
    marginBottom: 16,
  },
  sectionHeader: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    color: colors.accent,
    letterSpacing: 1,
    marginBottom: 12,
  },
  fieldLabel: {
    fontFamily: FONTS.monoRegular,
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 6,
    marginTop: 10,
    letterSpacing: 0.5,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 12,
  },
  fieldHalf: {
    flex: 1,
  },
  textInput: {
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    fontFamily: FONTS.sansRegular,
    fontSize: 14,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  textArea: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
    marginBottom: 4,
  },
  chip: {
    minHeight: 44,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipInactive: {
    backgroundColor: colors.panelRecessed,
    borderColor: colors.borderSubtle,
  },
  chipText: {
    fontFamily: FONTS.monoMedium,
    fontSize: 12,
  },
  chipTextActive: {
    color: colors.canvas,
    fontWeight: '700',
  },
  chipTextInactive: {
    color: colors.textSecondary,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
    marginBottom: 8,
  },
  presetChip: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1,
  },
  presetChipText: {
    fontFamily: FONTS.sansBold,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 14,
  },
  toggleRowActive: {
    backgroundColor: colors.panelRecessed,
    borderColor: colors.accent,
  },
  toggleRowInactive: {
    backgroundColor: colors.panelRecessed,
    borderColor: colors.borderSubtle,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  toggleTextContainer: {
    flex: 1,
  },
  toggleTitle: {
    fontFamily: FONTS.monoBold,
    fontSize: 12,
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  toggleSubtitle: {
    fontFamily: FONTS.sansRegular,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  switchTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  switchTrackActive: {
    backgroundColor: colors.accent,
  },
  switchTrackInactive: {
    backgroundColor: colors.borderSubtle,
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.textPrimary,
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
  },
  switchThumbInactive: {
    alignSelf: 'flex-start',
  },
  notFoundContainer: {
    flex: 1,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  notFoundTitle: {
    fontFamily: FONTS.sansBold,
    fontSize: 18,
    color: colors.textPrimary,
  },
  backButton: {
    minHeight: 44,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 8,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontFamily: FONTS.monoBold,
    fontSize: 12,
    color: colors.accent,
  },
});
