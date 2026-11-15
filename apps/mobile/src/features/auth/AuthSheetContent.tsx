import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as Haptics from "expo-haptics";
import {
  LogOut,
  AlertCircle,
  CheckCircle2,
  Lock,
  Mail,
  User as UserIcon,
  Settings,
  ArrowLeft,
  ChevronRight,
} from "lucide-react-native";
import { makeStyles, useTheme, SegmentedControl } from "@brewlog/ui";
import { FONTS } from "../../theme/fonts";
import { useAuth } from "./AuthContext";

export interface AuthSheetContentProps {
  isActive: boolean;
  onDismiss: () => void;
  onOpenSettings: () => void;
  onSubmittingChange?: (submitting: boolean) => void;
}

type AuthMode = "signin" | "signup" | "forgot";

export const AuthSheetContent: React.FC<AuthSheetContentProps> = ({
  isActive,
  onDismiss,
  onOpenSettings,
  onSubmittingChange,
}) => {
  const styles = useStyles();
  const { colors } = useTheme();
  const {
    user,
    isConfigured,
    signInWithEmail,
    signUpWithEmail,
    resetPasswordForEmail,
    signOut,
  } = useAuth();

  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const onSubmittingChangeRef = useRef(onSubmittingChange);
  onSubmittingChangeRef.current = onSubmittingChange;

  const updateSubmitting = useCallback((next: boolean) => {
    setSubmitting(next);
    onSubmittingChangeRef.current?.(next);
  }, []);

  useEffect(() => {
    setPassword("");
    if (isActive) {
      setMode("signin");
      setErrorMessage(null);
      setSuccessMessage(null);
      updateSubmitting(false);
    }
  }, [isActive, user, updateSubmitting]);

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setErrorMessage(null);
    setSuccessMessage(null);
    Haptics.selectionAsync().catch(() => {});
  };

  const handleSubmit = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim() || !email.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }

    if (mode !== "forgot" && password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }

    updateSubmitting(true);

    try {
      if (mode === "signin") {
        const { error } = await signInWithEmail(email, password);
        if (error) {
          setErrorMessage(error.message);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          updateSubmitting(false);
          onDismiss();
        }
      } else if (mode === "signup") {
        const { error } = await signUpWithEmail(email, password, displayName);
        if (error) {
          setErrorMessage(error.message);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          setPassword("");
          setSuccessMessage("Check your inbox for the confirmation link!");
        }
      } else if (mode === "forgot") {
        const { error } = await resetPasswordForEmail(email);
        if (error) {
          setErrorMessage(error.message);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          setSuccessMessage("Password reset email sent!");
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "An unexpected error occurred. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      updateSubmitting(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out of BrewLog cloud?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut();
          } catch {
            // Proceed with local cleanup even if remote sign-out rejects
          }
          setEmail("");
          setPassword("");
          setDisplayName("");
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          onDismiss();
        },
      },
    ]);
  };

  return (
    <>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>
            {user ? "Profile" : mode === "forgot" ? "RESET PASSWORD" : "BREWLOG CLOUD"}
          </Text>
        </View>
      </View>

      {/* Logged In View */}
      {user ? (
        <View style={styles.profileSection}>
          <View style={styles.statusCard}>
            <View style={styles.statusCardHeader}>
              <View style={styles.statusRow}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>CLOUD CONNECTED</Text>
              </View>
              <TouchableOpacity
                onPress={handleSignOut}
                activeOpacity={0.7}
                style={styles.cardSignOutCompact}
                accessibilityRole="button"
                accessibilityLabel="Sign out"
              >
                <LogOut size={12} color={colors.statusError} />
                <Text style={styles.cardSignOutCompactText}>SIGN OUT</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.profileName}>
              {user.user_metadata?.display_name || "Barista"}
            </Text>
            <Text style={styles.profileEmail}>{user.email}</Text>
            <Text style={styles.profileId}>
              ID: {user.id.length > 18 ? `${user.id.substring(0, 18)}...` : user.id}
            </Text>
          </View>
        </View>
      ) : (
        /* Logged Out View */
        <View style={styles.formSection}>
          {/* Unconfigured Alert */}
          {!isConfigured && (
            <View style={styles.alertBanner}>
              <AlertCircle size={16} color={colors.accent} />
              <Text style={styles.alertText}>
                Supabase credentials not detected in .env. Running in offline mode.
              </Text>
            </View>
          )}

          {/* Mode Toggle */}
          {mode !== "forgot" && (
            <SegmentedControl
              fullWidth
              value={mode}
              onChange={(val) => switchMode(val as "signin" | "signup")}
              options={[
                { value: "signin", label: "SIGN IN" },
                { value: "signup", label: "CREATE ACCOUNT" },
              ]}
              ariaLabel="Authentication mode"
            />
          )}

          {/* Error / Success Feedback */}
          {errorMessage && (
            <View style={styles.errorBanner}>
              <AlertCircle size={15} color={colors.statusError} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {successMessage && (
            <View style={styles.successBanner}>
              <CheckCircle2 size={15} color={colors.statusSuccess} />
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          )}

          {/* Form Inputs */}
          {mode === "signup" && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>BARISTA TAG / NAME</Text>
              <View style={styles.inputWrapper}>
                <UserIcon size={16} color={colors.textMuted} />
                <TextInput
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="e.g. Greg"
                  placeholderTextColor={colors.textMuted}
                  autoComplete="name"
                  textContentType="name"
                  importantForAutofill="yes"
                  style={styles.input}
                  autoCapitalize="words"
                />
              </View>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
            <View style={styles.inputWrapper}>
              <Mail size={16} color={colors.textMuted} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoComplete={mode === "signin" ? "username" : "email"}
                textContentType={mode === "signin" ? "username" : "emailAddress"}
                importantForAutofill="yes"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
              />
            </View>
          </View>

          {mode !== "forgot" && (
            <View style={styles.inputGroup}>
              <View style={styles.inputLabelRow}>
                <Text style={styles.inputLabel}>PASSWORD</Text>
                {mode === "signin" && (
                  <TouchableOpacity
                    onPress={() => switchMode("forgot")}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={styles.forgotButton}
                  >
                    <Text style={styles.forgotLink}>Forgot password?</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.inputWrapper}>
                <Lock size={16} color={colors.textMuted} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={true}
                  autoComplete={mode === "signup" ? "password-new" : "password"}
                  textContentType={mode === "signup" ? "newPassword" : "password"}
                  importantForAutofill="yes"
                  autoCapitalize="none"
                  autoCorrect={false}
                  spellCheck={false}
                  style={styles.input}
                />
              </View>
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.8}
            style={[
              styles.submitButton,
              submitting && styles.submitButtonDisabled,
            ]}
          >
            {submitting ? (
              <ActivityIndicator color={colors.canvas} size="small" />
            ) : (
              <Text style={styles.submitButtonText}>
                {mode === "signin"
                  ? "SIGN IN"
                  : mode === "signup"
                  ? "CREATE ACCOUNT"
                  : "SEND RESET LINK"}
              </Text>
            )}
          </TouchableOpacity>

          {mode === "forgot" && (
            <TouchableOpacity
              onPress={() => switchMode("signin")}
              style={styles.backButton}
            >
              <ArrowLeft size={14} color={colors.accent} />
              <Text style={styles.backButtonText}>Back to Sign In</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Settings Entry */}
      <View style={styles.preferencesSection}>
        <TouchableOpacity
          onPress={submitting ? undefined : onOpenSettings}
          disabled={submitting}
          activeOpacity={0.7}
          style={styles.preferencesRow}
          accessibilityRole="button"
          accessibilityLabel="Settings"
        >
          <View style={styles.preferencesLeft}>
            <Settings size={18} color={colors.foregroundSecondary} />
            <View style={styles.preferencesTextGroup}>
              <Text style={styles.preferencesTitle}>Settings</Text>
              <Text style={styles.preferencesSubtitle}>Units, timer mode & calibration</Text>
            </View>
          </View>
          <ChevronRight size={16} color={colors.foregroundMuted} />
        </TouchableOpacity>
      </View>
    </>
  );
};

const useStyles = makeStyles((colors) => ({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontFamily: FONTS.monoBold,
    fontSize: 14,
    letterSpacing: 0.5,
    color: colors.foreground,
  },
  profileSection: {
    gap: 16,
  },
  statusCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.panelRecessed,
    padding: 16,
    gap: 8,
  },
  statusCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardSignOutCompact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.statusError + "14",
    borderWidth: 1,
    borderColor: colors.statusError + "33",
  },
  cardSignOutCompactText: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    letterSpacing: 0.5,
    color: colors.statusError,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.statusSuccess,
  },
  statusText: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    letterSpacing: 0.8,
    color: colors.statusSuccess,
  },
  profileName: {
    fontFamily: FONTS.sansBold,
    fontSize: 20,
    color: colors.foreground,
  },
  profileEmail: {
    fontFamily: FONTS.monoRegular,
    fontSize: 12,
    color: colors.foregroundMuted,
  },
  profileId: {
    fontFamily: FONTS.monoRegular,
    fontSize: 10,
    color: colors.foregroundMuted,
  },
  formSection: {
    gap: 14,
  },
  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: colors.statusWarning + "1a",
    borderColor: colors.statusWarning + "4d",
  },
  alertText: {
    flex: 1,
    fontFamily: FONTS.monoRegular,
    fontSize: 11,
    color: colors.statusWarning,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
    backgroundColor: colors.statusError + "1a",
    borderColor: colors.statusError + "4d",
  },
  errorText: {
    fontFamily: FONTS.monoRegular,
    fontSize: 11,
    flex: 1,
    color: colors.statusError,
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
    backgroundColor: colors.statusSuccess + "1a",
    borderColor: colors.statusSuccess + "4d",
  },
  successText: {
    fontFamily: FONTS.monoRegular,
    fontSize: 11,
    flex: 1,
    color: colors.statusSuccess,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  inputLabel: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    letterSpacing: 0.5,
    color: colors.foregroundMuted,
  },
  forgotButton: {
    minHeight: 44,
    justifyContent: "center",
  },
  forgotLink: {
    fontFamily: FONTS.monoRegular,
    fontSize: 10,
    color: colors.accent,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.panelRecessed,
    paddingHorizontal: 12,
    height: 44,
  },
  input: {
    flex: 1,
    fontFamily: FONTS.monoRegular,
    fontSize: 13,
    height: "100%",
    color: colors.foreground,
  },
  submitButton: {
    height: 44,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 6,
    backgroundColor: colors.accent,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontFamily: FONTS.monoBold,
    fontSize: 12,
    letterSpacing: 0.8,
    color: colors.canvas,
  },
  backButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 6,
  },
  backButtonText: {
    fontFamily: FONTS.monoRegular,
    fontSize: 11,
    color: colors.foregroundMuted,
  },
  preferencesSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  preferencesRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 4,
    minHeight: 44,
  },
  preferencesLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  preferencesTextGroup: {
    gap: 2,
  },
  preferencesTitle: {
    fontFamily: FONTS.monoBold,
    fontSize: 12,
    letterSpacing: 0.8,
    color: colors.foreground,
  },
  preferencesSubtitle: {
    fontFamily: FONTS.monoRegular,
    fontSize: 10,
    color: colors.foregroundMuted,
  },
}));
