import React from "react";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { User as UserIcon } from "lucide-react-native";
import { INDUSTRIAL_PRECISION_THEME } from "@brewlog/core";
import { FONTS } from "../../theme/fonts";
import { useAuth } from "./AuthContext";

const { colors } = INDUSTRIAL_PRECISION_THEME;

export interface ProfileHeaderButtonProps {
  onPress: () => void;
}

function getInitials(nameOrEmail: string): string {
  const parts = nameOrEmail.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return (nameOrEmail.substring(0, 2)).toUpperCase();
}

export const ProfileHeaderButton: React.FC<ProfileHeaderButtonProps> = ({ onPress }) => {
  const { user } = useAuth();

  const displayName = user?.user_metadata?.display_name || user?.email;
  const initials = displayName ? getInitials(displayName) : null;

  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Account profile"
      activeOpacity={0.7}
      style={styles.container}
    >
      {initials ? (
        <View style={styles.avatarBadge}>
          <Text style={styles.initialsText}>{initials}</Text>
          <View testID="connection-dot" style={styles.connectionDot} />
        </View>
      ) : (
        <View style={styles.iconWrapper}>
          <UserIcon size={20} color={colors.textMuted} />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.panelRecessed,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  initialsText: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  connectionDot: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.statusSuccess,
    borderWidth: 1.5,
    borderColor: colors.panel,
  },
});
