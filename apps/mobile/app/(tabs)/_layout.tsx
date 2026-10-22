import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Keyboard } from 'react-native';
import { Tabs } from 'expo-router';
import { INDUSTRIAL_PRECISION_THEME } from '@brewlog/core';
import { ProfileHeaderButton } from '../../src/features/auth/ProfileHeaderButton';
import { AuthSheet } from '../../src/features/auth/AuthSheet';
import { FloatingPillTabBar } from '../../src/components/navigation/FloatingPillTabBar';

export default function TabLayout() {
  const { colors } = INDUSTRIAL_PRECISION_THEME;
  const [authSheetVisible, setAuthSheetVisible] = useState(false);

  const handleOpenAuthSheet = useCallback(() => {
    Keyboard.dismiss();
    setAuthSheetVisible(true);
  }, []);

  const handleCloseAuthSheet = useCallback(() => {
    Keyboard.dismiss();
    setAuthSheetVisible(false);
  }, []);

  const renderHeaderRight = useCallback(
    () => <ProfileHeaderButton onPress={handleOpenAuthSheet} />,
    [handleOpenAuthSheet]
  );

  return (
    <View style={styles.container}>
      <Tabs
        tabBar={(props) => <FloatingPillTabBar {...props} />}
        screenOptions={{
          animation: 'shift',
          headerStyle: {
            backgroundColor: colors.panel,
          },
          headerTitleStyle: {
            color: colors.textPrimary,
          },
          headerRight: renderHeaderRight,
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
            title: 'Brew Timer',
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
        onClose={handleCloseAuthSheet}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
});
