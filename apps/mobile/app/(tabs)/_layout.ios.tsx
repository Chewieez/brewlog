import React, { useCallback, useEffect, useRef } from 'react';
import { Keyboard } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';
import { useTheme } from '@brewlog/ui';
import { AuthModalContext } from '../../src/features/auth/AuthModalContext';

export default function TabLayoutIOS() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const isOpeningRef = useRef(false);
  const isAuthSheetVisible = pathname === '/auth/sheet';

  useEffect(() => {
    isOpeningRef.current = false;
  }, [pathname]);

  const openAuthSheet = useCallback(() => {
    Keyboard.dismiss();
    if (pathname === '/auth/sheet' || isOpeningRef.current) {
      return;
    }
    isOpeningRef.current = true;
    router.navigate('/auth/sheet');
  }, [pathname, router]);

  const closeAuthSheet = useCallback(() => {
    Keyboard.dismiss();
    isOpeningRef.current = false;
    if (pathname !== '/auth/sheet') {
      return;
    }
    if (router.canDismiss()) {
      router.dismiss();
    } else if (router.canGoBack()) {
      router.back();
    }
  }, [pathname, router]);

  return (
    <AuthModalContext.Provider
      value={{
        openAuthSheet,
        closeAuthSheet,
        isAuthSheetVisible,
      }}
    >
      <NativeTabs
        blurEffect={isDark ? 'dark' : 'systemMaterialLight'}
        tintColor={colors.accent}
        iconColor={{
          default: colors.foregroundSecondary,
          selected: colors.accent,
        }}
        labelStyle={{
          default: {
            color: colors.foregroundSecondary,
          },
          selected: {
            color: colors.accent,
          },
        }}
      >
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Label>Timer</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            src={require('../../assets/tabs/timer.png')}
            renderingMode="template"
          />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="stash">
          <NativeTabs.Trigger.Label>Stash</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            src={require('../../assets/tabs/stash.png')}
            renderingMode="template"
          />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="recipes">
          <NativeTabs.Trigger.Label>Recipes</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            src={require('../../assets/tabs/recipes.png')}
            renderingMode="template"
          />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="equipment">
          <NativeTabs.Trigger.Label>Equipment</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            src={require('../../assets/tabs/equipment.png')}
            renderingMode="template"
          />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="reviews">
          <NativeTabs.Trigger.Label>Reviews</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            src={require('../../assets/tabs/reviews.png')}
            renderingMode="template"
          />
        </NativeTabs.Trigger>
      </NativeTabs>
    </AuthModalContext.Provider>
  );
}
