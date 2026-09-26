import { jsx as _jsx } from "react/jsx-runtime";
import { View, Pressable, StyleSheet } from 'react-native';
import { INDUSTRIAL_PRECISION_THEME } from '@brewlog/core';
const colors = INDUSTRIAL_PRECISION_THEME.colors;
export const Card = ({ children, variant = 'default', padding = 'md', onPress, testID, accessibilityLabel, }) => {
    const paddingStyles = {
        none: styles.padNone,
        sm: styles.padSm,
        md: styles.padMd,
        lg: styles.padLg,
    }[padding];
    const surfaceStyles = [
        styles.base,
        paddingStyles,
        variant === 'recessed' ? styles.recessed : styles.panel,
    ];
    if (onPress) {
        return (_jsx(Pressable, { testID: testID, accessibilityLabel: accessibilityLabel, accessibilityRole: "button", onPress: onPress, style: ({ pressed }) => [
                ...surfaceStyles,
                pressed && styles.pressed,
            ], children: children }));
    }
    return (_jsx(View, { testID: testID, accessibilityLabel: accessibilityLabel, style: surfaceStyles, children: children }));
};
const styles = StyleSheet.create({
    base: {
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
        overflow: 'hidden',
    },
    panel: { backgroundColor: colors.panel },
    recessed: { backgroundColor: colors.panelRecessed },
    padNone: { padding: 0 },
    padSm: { padding: 12 },
    padMd: { padding: 16 },
    padLg: { padding: 24 },
    pressed: {
        borderColor: colors.borderActive,
        opacity: 0.85,
    },
});
