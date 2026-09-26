import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { INDUSTRIAL_PRECISION_THEME } from '@brewlog/core';
import type { InputProps } from './Input.types';

const colors = INDUSTRIAL_PRECISION_THEME.colors;

export const Input: React.FC<InputProps> = ({
  value,
  onChangeText,
  label,
  placeholder,
  variant = 'default',
  unit,
  error,
  disabled = false,
  testID,
  accessibilityLabel,
}) => {
  const isNumeric = variant === 'numeric';

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputWrapper, error ? styles.inputWrapperError : null]}>
        <TextInput
          testID={testID}
          accessibilityLabel={accessibilityLabel || label}
          editable={!disabled}
          value={String(value)}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          keyboardType={isNumeric ? 'decimal-pad' : 'default'}
          onChangeText={onChangeText}
          style={[
            styles.input,
            isNumeric ? styles.numericInput : styles.standardInput,
          ]}
        />
        {unit && <Text style={styles.unit}>{unit}</Text>}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  label: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 44,
  },
  inputWrapperError: {
    borderColor: colors.statusError,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  numericInput: {
    fontFamily: 'Outfit_300Light',
    fontSize: 20,
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
  },
  standardInput: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 14,
    textAlign: 'left',
  },
  unit: {
    fontFamily: 'Outfit_300Light',
    fontSize: 14,
    color: colors.textMuted,
    marginLeft: 4,
  },
  errorText: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 11,
    color: colors.statusError,
  },
});
