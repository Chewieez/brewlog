import React from "react";
import { View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Coffee } from "lucide-react-native";
import { makeStyles, useTheme } from "@brewlog/ui";
import { FONTS } from "../../theme/fonts";
import { ProfileHeaderButton } from "../../features/auth/ProfileHeaderButton";

export interface TopAppHeaderProps {
  onProfilePress: () => void;
}

export const TopAppHeader: React.FC<TopAppHeaderProps> = ({ onProfilePress }) => {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      testID="top-app-header"
      style={[styles.wrapper, { paddingTop: insets.top }]}
    >
      <View style={styles.bar}>
        <View style={styles.brandRow}>
          <View testID="top-app-header-brand-icon" style={styles.brandIconBadge}>
            <Coffee size={16} color={colors.accent} />
          </View>
          <Text
            accessibilityRole="header"
            numberOfLines={1}
            style={styles.brandTitle}
          >
            BrewLog
          </Text>
        </View>

        <ProfileHeaderButton onPress={onProfilePress} />
      </View>
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  wrapper: {
    backgroundColor: colors.canvas,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  bar: {
    minHeight: 52,
    paddingLeft: 16,
    paddingRight: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 1,
  },
  brandIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: {
    fontFamily: FONTS.displayBold,
    fontSize: 18,
    letterSpacing: -0.3,
    color: colors.foreground,
    flexShrink: 1,
  },
}));
