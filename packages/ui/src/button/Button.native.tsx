import React from 'react';
import { Pressable, Text, ActivityIndicator, View, StyleSheet } from 'react-native';
import { INDUSTRIAL_PRECISION_THEME } from '@brewlog/core';
import type { ButtonProps } from './Button.types';

const colors = INDUSTRIAL_PRECISION_THEME.colors;

export const Button: React.FC<ButtonProps> = ({
  label,
  children,
  variant = 'primary',
  size = 'md',
  onPress,
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  testID,
  accessibilityLabel,
}) => {
  const isSm = size === 'sm';
  const isLg = size === 'lg';

  const containerStyles = [
    styles.base,
    isSm ? styles.smContainer : isLg ? styles.lgContainer : styles.mdContainer,
    variant === 'primary' && styles.primaryContainer,
    variant === 'secondary' && styles.secondaryContainer,
    variant === 'ghost' && styles.ghostContainer,
    variant === 'danger' && styles.dangerContainer,
    (disabled || loading) && styles.disabledContainer,
  ];

  const textStyles = [
    styles.baseText,
    isSm ? styles.smText : styles.mdText,
    variant === 'primary' && styles.primaryText,
    variant === 'secondary' && styles.secondaryText,
    variant === 'ghost' && styles.ghostText,
    variant === 'danger' && styles.dangerText,
    disabled && styles.disabledText,
  ];

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || (typeof label === 'string' ? label : undefined)}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        ...containerStyles,
        pressed && !disabled && !loading && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          testID="button-loading"
          color={variant === 'primary' ? colors.canvas : variant === 'danger' ? colors.statusError : colors.accent}
          size="small"
        />
      ) : (
        icon && iconPosition === 'left' && <View style={styles.iconSlot}>{icon}</View>
      )}
      {children !== undefined && children !== null ? (
        typeof children === 'string' || typeof children === 'number' ? (
          <Text style={textStyles}>{children}</Text>
        ) : (
          children
        )
      ) : (
        <Text style={textStyles}>{label}</Text>
      )}
      {!loading && icon && iconPosition === 'right' && <View style={styles.iconSlot}>{icon}</View>}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    gap: 8,
  },
  smContainer: { minHeight: 44, paddingHorizontal: 12, paddingVertical: 8 },
  mdContainer: { minHeight: 48, paddingHorizontal: 16, paddingVertical: 12 },
  lgContainer: { minHeight: 52, paddingHorizontal: 20, paddingVertical: 14 },
  primaryContainer: { backgroundColor: colors.accent },
  secondaryContainer: {
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  ghostContainer: { backgroundColor: 'transparent' },
  dangerContainer: {
    backgroundColor: `${colors.statusError}15`,
    borderWidth: 1,
    borderColor: `${colors.statusError}60`,
  },
  disabledContainer: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
  baseText: {
    fontFamily: 'JetBrainsMono_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  smText: { fontSize: 11 },
  mdText: { fontSize: 12 },
  primaryText: { color: colors.canvas },
  secondaryText: { color: colors.textPrimary },
  ghostText: { color: colors.textSecondary },
  dangerText: { color: colors.statusError },
  disabledText: { color: colors.textMuted },
  iconSlot: { alignItems: 'center', justifyContent: 'center' },
});
