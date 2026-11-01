import React from 'react';
import { View, Pressable, Text } from 'react-native';
import { makeStyles } from '../theme';
import type { SegmentedControlProps } from './SegmentedControl.types';

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  size = 'md',
  fullWidth = false,
  testID,
  ariaLabel,
}: SegmentedControlProps<T>) {
  const styles = useStyles();
  const isSm = size === 'sm';

  return (
    <View
      testID={testID}
      role="group"
      accessibilityLabel={ariaLabel}
      style={[
        styles.container,
        fullWidth ? styles.fullWidth : styles.fixedWidth,
        isSm && styles.containerSm,
      ]}
    >
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <Pressable
            key={option.value}
            testID={option.testID}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            aria-pressed={isSelected}
            accessibilityLabel={option.accessibilityLabel || option.label}
            onPress={() => onChange(option.value)}
            style={[
              styles.button,
              isSm && styles.buttonSm,
              isSelected && styles.buttonActive,
            ]}
          >
            <Text
              style={[
                styles.text,
                isSm && styles.textSm,
                isSelected && styles.textActive,
              ]}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.panelRecessed,
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.borderActive,
  },
  fullWidth: {
    width: '100%',
  },
  fixedWidth: {
    width: 320,
    maxWidth: '100%',
    alignSelf: 'flex-start',
  },
  containerSm: {
    padding: 2.5,
  },
  button: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    paddingHorizontal: 8,
  },
  buttonSm: {
    minHeight: 34,
    borderRadius: 5,
    paddingHorizontal: 6,
  },
  buttonActive: {
    backgroundColor: colors.accent,
  },
  text: {
    color: colors.foregroundMuted,
    fontSize: 11,
    fontFamily: 'JetBrainsMono_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  textSm: {
    fontSize: 10,
    letterSpacing: 1,
  },
  textActive: {
    color: colors.canvas,
  },
}));
