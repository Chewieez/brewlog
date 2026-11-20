import React from "react";
import { View, Text, Pressable } from "react-native";
import { Plus } from "lucide-react-native";
import { makeStyles, useTheme } from "@brewlog/ui";
import { FONTS } from "../../theme/fonts";

export interface TabScreenHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onActionPress?: () => void;
  actionAccessibilityLabel?: string;
}

export const TabScreenHeader: React.FC<TabScreenHeaderProps> = ({
  title,
  subtitle,
  actionLabel,
  onActionPress,
  actionAccessibilityLabel,
}) => {
  const styles = useStyles();
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View testID="tab-screen-header-title-row" style={styles.titleRow}>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>

        {actionLabel && onActionPress ? (
          <Pressable
            onPress={onActionPress}
            style={({ pressed }) => [
              styles.actionButton,
              pressed && styles.actionButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={actionAccessibilityLabel ?? actionLabel}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Plus size={16} color={colors.canvas} />
            <Text numberOfLines={1} style={styles.actionButtonText}>
              {actionLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  container: {
    gap: 4,
    paddingBottom: 6,
  },
  titleRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    alignContent: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    columnGap: 12,
    rowGap: 8,
  },
  title: {
    fontSize: 26,
    fontFamily: FONTS.displaySemiBold,
    color: colors.foreground,
    flexShrink: 1,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: colors.accent,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexShrink: 0,
    maxWidth: "100%",
    marginLeft: "auto",
  },
  actionButtonPressed: {
    opacity: 0.8,
  },
  actionButtonText: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    color: colors.canvas,
    letterSpacing: 1,
    flexShrink: 1,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: FONTS.bodyRegular,
    color: colors.foregroundSecondary,
  },
}));
