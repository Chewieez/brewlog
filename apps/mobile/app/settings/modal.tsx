import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  X,
  Sliders,
  RotateCcw,
  Cloud,
  HardDrive,
} from 'lucide-react-native';
import {
  INDUSTRIAL_PRECISION_THEME,
  WeightUnit,
  TemperatureUnit,
  TimerModePreference,
  DateFormatPreference,
} from '@brewlog/core';
import { useSettings } from '../../src/features/settings/SettingsContext';
import { useAuth } from '../../src/features/auth/AuthContext';
import { FONTS } from '../../src/theme/fonts';

const { colors } = INDUSTRIAL_PRECISION_THEME;

export default function SettingsModalScreen() {
  const router = useRouter();
  const { settings, updateSettings, resetToDefaults } = useSettings();
  const { user } = useAuth();

  const handleSelectWeight = async (unit: WeightUnit) => {
    if (settings.weightUnit === unit) return;
    Haptics.selectionAsync().catch(() => {});
    await updateSettings({ weightUnit: unit });
  };

  const handleSelectTemp = async (unit: TemperatureUnit) => {
    if (settings.temperatureUnit === unit) return;
    Haptics.selectionAsync().catch(() => {});
    await updateSettings({ temperatureUnit: unit });
  };

  const handleSelectTimerMode = async (mode: TimerModePreference) => {
    if (settings.defaultTimerMode === mode) return;
    Haptics.selectionAsync().catch(() => {});
    await updateSettings({ defaultTimerMode: mode });
  };

  const handleSelectDateFormat = async (format: DateFormatPreference) => {
    if (settings.dateFormat === format) return;
    Haptics.selectionAsync().catch(() => {});
    await updateSettings({ dateFormat: format });
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to restore all settings to default values?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetToDefaults();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Grabber Handle */}
      <View style={styles.grabberContainer}>
        <View style={styles.grabber} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleGroup}>
          <Text style={styles.eyebrow}>SYSTEM // CALIBRATION</Text>
          <View style={styles.titleRow}>
            <Sliders size={20} color={colors.accent} />
            <Text style={styles.headerTitle}>Instrument Settings</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel="Close settings"
          accessibilityRole="button"
          style={styles.closeButton}
        >
          <X size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Section 1: Weight Unit */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>WEIGHT UNIT</Text>
            <Text style={styles.sectionSublabel}>Primary mass measurement</Text>
          </View>
          <View style={styles.segmentedContainer}>
            <TouchableOpacity
              onPress={() => handleSelectWeight('metric')}
              activeOpacity={0.8}
              style={[
                styles.segmentTab,
                settings.weightUnit === 'metric' && styles.segmentTabActive,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Metric grams"
            >
              <Text
                style={[
                  styles.segmentText,
                  settings.weightUnit === 'metric' && styles.segmentTextActive,
                ]}
              >
                METRIC (g)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleSelectWeight('imperial')}
              activeOpacity={0.8}
              style={[
                styles.segmentTab,
                settings.weightUnit === 'imperial' && styles.segmentTabActive,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Imperial ounces"
            >
              <Text
                style={[
                  styles.segmentText,
                  settings.weightUnit === 'imperial' && styles.segmentTextActive,
                ]}
              >
                IMPERIAL (oz)
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 2: Temperature Unit */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>TEMPERATURE UNIT</Text>
            <Text style={styles.sectionSublabel}>Water kettle & brew extraction</Text>
          </View>
          <View style={styles.segmentedContainer}>
            <TouchableOpacity
              onPress={() => handleSelectTemp('celsius')}
              activeOpacity={0.8}
              style={[
                styles.segmentTab,
                settings.temperatureUnit === 'celsius' && styles.segmentTabActive,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Celsius degrees"
            >
              <Text
                style={[
                  styles.segmentText,
                  settings.temperatureUnit === 'celsius' && styles.segmentTextActive,
                ]}
              >
                CELSIUS (°C)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleSelectTemp('fahrenheit')}
              activeOpacity={0.8}
              style={[
                styles.segmentTab,
                settings.temperatureUnit === 'fahrenheit' && styles.segmentTabActive,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Fahrenheit degrees"
            >
              <Text
                style={[
                  styles.segmentText,
                  settings.temperatureUnit === 'fahrenheit' && styles.segmentTextActive,
                ]}
              >
                FAHRENHEIT (°F)
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 3: Default Timer Mode */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>DEFAULT TIMER MODE</Text>
            <Text style={styles.sectionSublabel}>Startup workflow preference</Text>
          </View>
          <View style={styles.segmentedContainer}>
            <TouchableOpacity
              onPress={() => handleSelectTimerMode('free_brew')}
              activeOpacity={0.8}
              style={[
                styles.segmentTab,
                settings.defaultTimerMode === 'free_brew' && styles.segmentTabActive,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Free brew mode"
            >
              <Text
                style={[
                  styles.segmentText,
                  settings.defaultTimerMode === 'free_brew' && styles.segmentTextActive,
                ]}
              >
                FREE BREW
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleSelectTimerMode('recipe')}
              activeOpacity={0.8}
              style={[
                styles.segmentTab,
                settings.defaultTimerMode === 'recipe' && styles.segmentTabActive,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Guided recipe mode"
            >
              <Text
                style={[
                  styles.segmentText,
                  settings.defaultTimerMode === 'recipe' && styles.segmentTextActive,
                ]}
              >
                GUIDED RECIPE
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 4: Date Format */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>DATE FORMAT</Text>
            <Text style={styles.sectionSublabel}>Roast & tasting log timestamps</Text>
          </View>
          <View style={styles.dateGridContainer}>
            <TouchableOpacity
              onPress={() => handleSelectDateFormat('locale')}
              activeOpacity={0.8}
              style={[
                styles.dateTab,
                settings.dateFormat === 'locale' && styles.segmentTabActive,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Locale date format"
            >
              <Text
                style={[
                  styles.segmentText,
                  settings.dateFormat === 'locale' && styles.segmentTextActive,
                ]}
              >
                LOCALE
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleSelectDateFormat('YYYY-MM-DD')}
              activeOpacity={0.8}
              style={[
                styles.dateTab,
                settings.dateFormat === 'YYYY-MM-DD' && styles.segmentTabActive,
              ]}
              accessibilityRole="button"
              accessibilityLabel="ISO YYYY-MM-DD date format"
            >
              <Text
                style={[
                  styles.segmentText,
                  settings.dateFormat === 'YYYY-MM-DD' && styles.segmentTextActive,
                ]}
              >
                YYYY-MM-DD
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleSelectDateFormat('MM/DD/YYYY')}
              activeOpacity={0.8}
              style={[
                styles.dateTab,
                settings.dateFormat === 'MM/DD/YYYY' && styles.segmentTabActive,
              ]}
              accessibilityRole="button"
              accessibilityLabel="American MM/DD/YYYY date format"
            >
              <Text
                style={[
                  styles.segmentText,
                  settings.dateFormat === 'MM/DD/YYYY' && styles.segmentTextActive,
                ]}
              >
                MM/DD/YYYY
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleSelectDateFormat('DD/MM/YYYY')}
              activeOpacity={0.8}
              style={[
                styles.dateTab,
                settings.dateFormat === 'DD/MM/YYYY' && styles.segmentTabActive,
              ]}
              accessibilityRole="button"
              accessibilityLabel="European DD/MM/YYYY date format"
            >
              <Text
                style={[
                  styles.segmentText,
                  settings.dateFormat === 'DD/MM/YYYY' && styles.segmentTextActive,
                ]}
              >
                DD/MM/YYYY
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 5: Cloud Sync Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusCardHeader}>
            {user ? (
              <Cloud size={18} color={colors.statusSuccess} />
            ) : (
              <HardDrive size={18} color={colors.accent} />
            )}
            <View style={styles.statusTextGroup}>
              <View style={styles.statusDotRow}>
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor: user
                        ? colors.statusSuccess
                        : colors.accent,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.statusTitle,
                    {
                      color: user
                        ? colors.statusSuccess
                        : colors.textPrimary,
                    },
                  ]}
                >
                  {user ? 'CLOUD SYNC ACTIVE' : 'LOCAL STORAGE ONLY'}
                </Text>
              </View>
              {user ? (
                <Text style={styles.statusUserEmail}>{user.email}</Text>
              ) : null}
              <Text style={styles.statusDescription}>
                {user
                  ? 'Instrument preferences synced across devices.'
                  : 'Saved to local device. Sign in to sync across platforms.'}
              </Text>
            </View>
          </View>
        </View>

        {/* Section 6: Reset to Defaults */}
        <TouchableOpacity
          onPress={handleReset}
          activeOpacity={0.8}
          style={styles.resetButton}
          accessibilityRole="button"
          accessibilityLabel="Reset to defaults"
        >
          <RotateCcw size={16} color={colors.statusError} />
          <Text style={styles.resetButtonText}>RESET TO DEFAULTS</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

export { SettingsModalScreen };

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  grabberContainer: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderSubtle,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  headerTitleGroup: {
    gap: 4,
  },
  eyebrow: {
    fontFamily: FONTS.monoRegular,
    fontSize: 10,
    letterSpacing: 1.2,
    color: colors.textMuted,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontFamily: FONTS.monoBold,
    fontSize: 16,
    letterSpacing: 0.5,
    color: colors.textPrimary,
  },
  closeButton: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 20,
  },
  sectionCard: {
    backgroundColor: colors.panel,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 16,
    gap: 12,
  },
  sectionHeaderRow: {
    gap: 2,
  },
  sectionLabel: {
    fontFamily: FONTS.monoBold,
    fontSize: 12,
    letterSpacing: 0.8,
    color: colors.textPrimary,
  },
  sectionSublabel: {
    fontFamily: FONTS.monoRegular,
    fontSize: 10,
    letterSpacing: 0.5,
    color: colors.textMuted,
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: colors.panelRecessed,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 3,
    gap: 4,
  },
  segmentTab: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    paddingHorizontal: 8,
  },
  segmentTabActive: {
    backgroundColor: colors.accent,
    shadowColor: colors.canvas,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  segmentText: {
    fontFamily: FONTS.monoMedium,
    fontSize: 12,
    letterSpacing: 0.5,
    color: colors.textSecondary,
  },
  segmentTextActive: {
    fontFamily: FONTS.monoBold,
    color: colors.canvas,
  },
  dateGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: colors.panelRecessed,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 3,
    gap: 4,
  },
  dateTab: {
    flexBasis: '49%',
    flexGrow: 1,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    paddingHorizontal: 8,
  },
  statusCard: {
    backgroundColor: colors.panelRecessed,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 16,
  },
  statusCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  statusTextGroup: {
    flex: 1,
    gap: 4,
  },
  statusDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusTitle: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  statusUserEmail: {
    fontFamily: FONTS.monoMedium,
    fontSize: 12,
    color: colors.textPrimary,
  },
  statusDescription: {
    fontFamily: FONTS.monoRegular,
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 16,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.statusError + '66',
    backgroundColor: colors.statusError + '1a',
    marginTop: 4,
  },
  resetButtonText: {
    fontFamily: FONTS.monoBold,
    fontSize: 12,
    letterSpacing: 0.5,
    color: colors.statusError,
  },
});
