import React from "react";
import { Pressable, View, Text } from "react-native";
import { User as UserIcon } from "lucide-react-native";
import { makeStyles, useTheme } from "@brewlog/ui";
import { FONTS } from "../../theme/fonts";
import { useOptionalAuth } from "./AuthContext";

export interface ProfileHeaderButtonProps {
  onPress: () => void;
}

function getInitials(nameOrEmail: string): string {
  const trimmed = nameOrEmail.trim();
  if (!trimmed) {
    return "";
  }
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return trimmed.substring(0, 2).toUpperCase();
}

export const ProfileHeaderButton: React.FC<ProfileHeaderButtonProps> = ({ onPress }) => {
  const styles = useStyles();
  const { colors } = useTheme();
  const auth = useOptionalAuth();
  const user = auth?.user ?? null;

  const rawDisplayName = user?.user_metadata?.display_name;
  const trimmedName = typeof rawDisplayName === "string" ? rawDisplayName.trim() : "";
  const trimmedEmail = typeof user?.email === "string" ? user.email.trim() : "";
  const displayName = trimmedName || trimmedEmail;
  const initials = displayName ? getInitials(displayName) : null;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Account profile"
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
    >
      {initials ? (
        <View style={styles.avatarWrapper}>
          <View style={styles.avatarBadge}>
            <Text style={styles.initialsText}>{initials}</Text>
          </View>
          <View testID="connection-dot" style={styles.connectionDot} />
        </View>
      ) : (
        <View style={styles.iconWrapper}>
          <UserIcon size={20} color={colors.foregroundMuted} />
        </View>
      )}
    </Pressable>
  );
};

const useStyles = makeStyles((colors) => ({
  container: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  pressed: {
    opacity: 0.7,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarWrapper: {
    width: 32,
    height: 32,
    position: "relative",
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
    overflow: "hidden",
  },
  initialsText: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    fontWeight: "700",
    color: colors.foreground,
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
}));
