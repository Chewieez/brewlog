import React from 'react';
import { DynamicColorIOS } from 'react-native';
import { NativeTabs } from 'expo-router/native-tabs';
import { INDUSTRIAL_PRECISION_THEME } from '@brewlog/core';

export default function TabLayoutIOS() {
  const { colors } = INDUSTRIAL_PRECISION_THEME;

  return (
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
        <NativeTabs.Trigger.Label>Brew Timer</NativeTabs.Trigger.Label>
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
  );
}
