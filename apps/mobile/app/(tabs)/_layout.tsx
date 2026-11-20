import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Keyboard } from 'react-native';
import { Tabs } from 'expo-router';
import { useTheme } from '@brewlog/ui';
import { AuthSheet } from '../../src/features/auth/AuthSheet';
import { FloatingPillTabBar } from '../../src/components/navigation/FloatingPillTabBar';
import { TopAppHeader } from '../../src/components/navigation/TopAppHeader';
import { AuthModalContext } from '../../src/features/auth/AuthModalContext';

export default function TabLayout() {
  const { colors } = useTheme();
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
      <View style={[styles.container, { backgroundColor: colors.canvas }]}>
        <TopAppHeader onProfilePress={openAuthSheet} />
        <Tabs
          tabBar={(props) => <FloatingPillTabBar {...props} />}
          screenOptions={{
            headerShown: false,
            animation: 'shift',
            tabBarStyle: {
              position: 'absolute',
              backgroundColor: 'transparent',
              borderTopWidth: 0,
              elevation: 0,
            },
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: 'Timer',
            }}
          />
          <Tabs.Screen
            name="stash"
            options={{
              title: 'Stash',
            }}
          />
          <Tabs.Screen
            name="recipes"
            options={{
              title: 'Recipes',
            }}
          />
          <Tabs.Screen
            name="equipment"
            options={{
              title: 'Equipment',
            }}
          />
          <Tabs.Screen
            name="reviews"
            options={{
              title: 'Reviews',
            }}
          />
        </Tabs>

        <AuthSheet
          visible={authSheetVisible}
          onClose={closeAuthSheet}
        />
      </View>
    </AuthModalContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
});
