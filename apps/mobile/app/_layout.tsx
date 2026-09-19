import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { INDUSTRIAL_PRECISION_THEME } from '@brewlog/core';

export default function RootLayout() {
  const { colors } = INDUSTRIAL_PRECISION_THEME;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.panel,
          },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: {
            fontWeight: '700',
          },
          contentStyle: {
            backgroundColor: colors.canvas,
          },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: 'BrewLog Mobile',
          }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}

