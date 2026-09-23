import "react-native-get-random-values";
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Outfit_300Light,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import { INDUSTRIAL_PRECISION_THEME } from '@brewlog/core';
import { AuthProvider } from '../src/features/auth/AuthContext';
import { RecipeProvider } from '../src/features/recipes/RecipeContext';
import { StashProvider } from '../src/features/stash/StashContext';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { colors } = INDUSTRIAL_PRECISION_THEME;

  const [fontsLoaded, fontError] = useFonts({
    Outfit_300Light,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RecipeProvider>
          <StashProvider>
            <StatusBar style="light" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: {
                  backgroundColor: colors.canvas,
                },
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="recipe/[id]"
                options={{
                  headerShown: true,
                  title: 'Recipe Details',
                  headerBackTitle: 'Back',
                  headerStyle: { backgroundColor: colors.panel },
                  headerTintColor: colors.textPrimary,
                  headerTitleStyle: { fontWeight: '700' },
                }}
              />
              <Stack.Screen
                name="recipe/builder"
                options={{
                  headerShown: false,
                  presentation: 'modal',
                }}
              />
              <Stack.Screen
                name="stash/[id]"
                options={{
                  headerShown: true,
                  title: 'Coffee Details',
                  headerBackTitle: 'Back',
                  headerStyle: { backgroundColor: colors.canvas },
                  headerTintColor: colors.textPrimary,
                  headerTitleStyle: { fontWeight: '700' },
                }}
              />
            </Stack>
          </StashProvider>
        </RecipeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
