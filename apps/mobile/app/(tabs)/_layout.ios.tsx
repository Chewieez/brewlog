import React, { useState, useCallback } from 'react';
import { DynamicColorIOS, Keyboard } from 'react-native';
import { NativeTabs } from 'expo-router/native-tabs';
import { INDUSTRIAL_PRECISION_THEME } from '@brewlog/core';
import { AuthSheet } from '../../src/features/auth/AuthSheet';
import { AuthModalContext } from '../../src/features/auth/AuthModalContext';

export default function TabLayoutIOS() {
  const { colors } = INDUSTRIAL_PRECISION_THEME;
  const [authSheetVisible, setAuthSheetVisible] = useState(false);

  const openAuthSheet = useCallback(() => {
    Keyboard.dismiss();
    setAuthSheetVisible(true);
  }, []);

  const closeAuthSheet = useCallback(() => {
    Keyboard.dismiss();
    setAuthSheetVisible(false);
  }, []);

  return (
    <AuthModalContext.Provider
      value={{
        openAuthSheet,
        closeAuthSheet,
        isAuthSheetVisible: authSheetVisible,
      }}
    >
      <NativeTabs
        tintColor={colors.accent}
        labelStyle={{
          color: DynamicColorIOS({
            light: colors.textSecondary,
            dark: colors.textPrimary,
          }),
        }}
      >
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Label>Timer</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{ default: 'timer', selected: 'timer' }}
          />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="stash">
          <NativeTabs.Trigger.Label>Stash</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{ default: 'cup.and.saucer', selected: 'cup.and.saucer.fill' }}
          />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="recipes">
          <NativeTabs.Trigger.Label>Recipes</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{ default: 'book.closed', selected: 'book.closed.fill' }}
          />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="equipment">
          <NativeTabs.Trigger.Label>Equipment</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{ default: 'scalemass', selected: 'scalemass.fill' }}
          />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="reviews">
          <NativeTabs.Trigger.Label>Reviews</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{ default: 'rosette', selected: 'rosette' }}
          />
        </NativeTabs.Trigger>
      </NativeTabs>

      <AuthSheet
        visible={authSheetVisible}
        onClose={closeAuthSheet}
      />
    </AuthModalContext.Provider>
  );
}
