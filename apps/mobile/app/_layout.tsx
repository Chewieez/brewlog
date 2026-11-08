import "react-native-get-random-values";
import React, { useEffect, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { Stack } from 'expo-router';
import * as Sentry from '@sentry/react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import * as SplashScreen from 'expo-splash-screen';
import { initSentry } from '../src/lib/sentry';
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
import { NavigationBar } from 'expo-navigation-bar';
import { ThemeProvider, useTheme, resolveTheme } from '@brewlog/ui';
import { AuthProvider } from '../src/features/auth/AuthContext';
import { SettingsProvider, useSettings } from '../src/features/settings/SettingsContext';
import { RecipeProvider } from '../src/features/recipes/RecipeContext';
import { StashProvider } from '../src/features/stash/StashContext';
import { EquipmentProvider } from '../src/features/equipment/EquipmentContext';
import { ReviewsProvider } from '../src/features/reviews/ReviewsContext';

initSentry();

SplashScreen.preventAutoHideAsync();

function RootLayout() {
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
      <KeyboardProvider statusBarTranslucent navigationBarTranslucent>
        <AuthProvider>
          <SettingsProvider>
            <RecipeProvider>
              <StashProvider>
                <EquipmentProvider>
                  <ReviewsProvider>
                    <ThemedAppNavigator />
                  </ReviewsProvider>
                </EquipmentProvider>
              </StashProvider>
            </RecipeProvider>
          </SettingsProvider>
        </AuthProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}

function ThemedAppNavigator() {
  const { settings } = useSettings();
  const colorScheme = useColorScheme();

  const activeTheme = useMemo(
    () => resolveTheme(settings.theme, colorScheme === 'dark'),
    [settings.theme, colorScheme]
  );

  return (
    <ThemeProvider theme={activeTheme}>
      <NavigationRoot />
    </ThemeProvider>
  );
}

function NavigationRoot() {
  const { colors, isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <NavigationBar style={isDark ? 'light' : 'dark'} />
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
            headerTintColor: colors.foreground,
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
            title: 'Bean Details',
            headerBackTitle: 'Back',
            headerStyle: { backgroundColor: colors.canvas },
            headerTintColor: colors.foreground,
            headerTitleStyle: { fontWeight: '700' },
          }}
        />
        <Stack.Screen
          name="stash/modal"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="equipment/modal"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="reviews/modal"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="reviews/[id]"
          options={{
            headerShown: true,
            title: 'Review Details',
            headerBackTitle: 'Back',
            headerStyle: { backgroundColor: colors.canvas },
            headerTintColor: colors.foreground,
            headerTitleStyle: { fontWeight: '700' },
          }}
        />
        <Stack.Screen
          name="settings/modal"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
      </Stack>
    </>
  );
}

export default Sentry.wrap(RootLayout);
