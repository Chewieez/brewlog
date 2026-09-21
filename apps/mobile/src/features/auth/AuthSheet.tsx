import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import * as Haptics from "expo-haptics";
import {
  Sparkles,
  LogOut,
  AlertCircle,
  CheckCircle2,
  Lock,
  Mail,
  User as UserIcon,
} from "lucide-react-native";
import { INDUSTRIAL_PRECISION_THEME } from "@brewlog/core";
import { FONTS } from "../../theme/fonts";
import { useAuth } from "./AuthContext";

const { colors } = INDUSTRIAL_PRECISION_THEME;

export interface AuthSheetProps {
  visible: boolean;
  onClose: () => void;
}

type AuthMode = "signin" | "signup" | "forgot";

export const AuthSheet: React.FC<AuthSheetProps> = ({ visible, onClose }) => {
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

  useEffect(() => {
    setPassword("");
    if (visible) {
      setMode("signin");
      setErrorMessage(null);
      setSuccessMessage(null);
      setSubmitting(false);
    }
  }, [visible, user]);

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

    setSubmitting(true);

    try {
      if (mode === "signin") {
        const { error } = await signInWithEmail(email, password);
        if (error) {
          setErrorMessage(error.message);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          onClose();
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
      setSubmitting(false);
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
          onClose();
        },
      },
    ]);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={submitting ? undefined : onClose}
    >
      <TouchableWithoutFeedback onPress={submitting ? undefined : onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={styles.sheetContainer}
            >
              {/* Grabber Handle */}
              <View style={styles.grabber} />

              <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
              >
                {/* Header */}
                <View style={styles.header}>
                  <View style={styles.headerLeft}>
                    <Sparkles size={18} color={colors.accent} />
                    <Text style={styles.headerTitle}>
                      {user ? "BARISTA PROFILE" : mode === "forgot" ? "RESET PASSWORD" : "BREWLOG CLOUD"}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={submitting ? undefined : onClose}
                    disabled={submitting}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    accessibilityLabel="Close sheet"
                    style={styles.closeButton}
                  >
                    <Text style={styles.closeText}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Logged In View */}
                {user ? (
                  <View style={styles.profileSection}>
                    <View style={styles.statusCard}>
                      <View style={styles.statusRow}>
                        <View style={styles.statusDot} />
                        <Text style={styles.statusText}>
                          CLOUD CONNECTED
                        </Text>
                      </View>
                      <Text style={styles.profileName}>
                        {user.user_metadata?.display_name || "Barista"}
                      </Text>
                      <Text style={styles.profileEmail}>
                        {user.email}
                      </Text>
                      <Text style={styles.profileId}>
                        ID: {user.id.length > 18 ? `${user.id.substring(0, 18)}...` : user.id}
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={handleSignOut}
                      activeOpacity={0.8}
                      style={styles.signOutButton}
                    >
                      <LogOut size={16} color={colors.statusError} />
                      <Text style={styles.signOutText}>SIGN OUT</Text>
                    </TouchableOpacity>
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
                      <View style={styles.modeToggleContainer}>
                        <TouchableOpacity
                          onPress={() => switchMode("signin")}
                          style={[
                            styles.toggleTab,
                            mode === "signin" && styles.activeTab,
                          ]}
                        >
                          <Text
                            style={[
                              styles.toggleTabText,
                              mode === "signin" && styles.activeToggleTabText,
                            ]}
                          >
                            SIGN IN
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => switchMode("signup")}
                          style={[
                            styles.toggleTab,
                            mode === "signup" && styles.activeTab,
                          ]}
                        >
                          <Text
                            style={[
                              styles.toggleTabText,
                              mode === "signup" && styles.activeToggleTabText,
                            ]}
                          >
                            CREATE ACCOUNT
                          </Text>
                        </TouchableOpacity>
                      </View>
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
                        <Text style={styles.inputLabel}>
                          BARISTA TAG / NAME
                        </Text>
                        <View style={styles.inputWrapper}>
                          <UserIcon size={16} color={colors.textMuted} />
                          <TextInput
                            value={displayName}
                            onChangeText={setDisplayName}
                            placeholder="e.g. Greg"
                            placeholderTextColor={colors.textMuted}
                            style={styles.input}
                            autoCapitalize="words"
                          />
                        </View>
                      </View>
                    )}

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>
                        EMAIL ADDRESS
                      </Text>
                      <View style={styles.inputWrapper}>
                        <Mail size={16} color={colors.textMuted} />
                        <TextInput
                          value={email}
                          onChangeText={setEmail}
                          placeholder="you@example.com"
                          placeholderTextColor={colors.textMuted}
                          keyboardType="email-address"
                          textContentType="emailAddress"
                          autoCapitalize="none"
                          autoCorrect={false}
                          style={styles.input}
                        />
                      </View>
                    </View>

                    {mode !== "forgot" && (
                      <View style={styles.inputGroup}>
                        <View style={styles.inputLabelRow}>
                          <Text style={styles.inputLabel}>
                            PASSWORD
                          </Text>
                          {mode === "signin" && (
                            <TouchableOpacity
                              onPress={() => switchMode("forgot")}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              style={styles.forgotButton}
                            >
                              <Text style={styles.forgotLink}>
                                Forgot password?
                              </Text>
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
                            textContentType={mode === "signup" ? "newPassword" : "password"}
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
                        <Text style={styles.backButtonText}>
                          ← Back to Sign In
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </ScrollView>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: colors.panel,
    borderColor: colors.borderSubtle,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    maxHeight: "90%",
    paddingBottom: 28,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderSubtle,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 8,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
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
    color: colors.textPrimary,
  },
  closeButton: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  closeText: {
    fontSize: 18,
    paddingHorizontal: 4,
    color: colors.textMuted,
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
    color: colors.textPrimary,
  },
  profileEmail: {
    fontFamily: FONTS.monoRegular,
    fontSize: 12,
    color: colors.textMuted,
  },
  profileId: {
    fontFamily: FONTS.monoRegular,
    fontSize: 10,
    color: colors.textMuted,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.statusError + "66",
    backgroundColor: colors.statusError + "1a",
  },
  signOutText: {
    fontFamily: FONTS.monoBold,
    fontSize: 12,
    letterSpacing: 0.5,
    color: colors.statusError,
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
  modeToggleContainer: {
    flexDirection: "row",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.panelRecessed,
    padding: 3,
  },
  toggleTab: {
    flex: 1,
    minHeight: 44,
    justifyContent: "center",
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: colors.accent,
    shadowColor: colors.canvas,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  toggleTabText: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    letterSpacing: 0.5,
    color: colors.textMuted,
  },
  activeToggleTabText: {
    color: colors.canvas,
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
    color: colors.textMuted,
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
    color: colors.textPrimary,
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
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 6,
  },
  backButtonText: {
    fontFamily: FONTS.monoRegular,
    fontSize: 11,
    color: colors.textMuted,
  },
});
