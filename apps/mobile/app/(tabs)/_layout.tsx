import React from 'react';
import { Tabs } from 'expo-router';
import {
  Timer,
  BookOpen,
  Coffee,
  Wrench,
  Award,
} from 'lucide-react-native';
import { INDUSTRIAL_PRECISION_THEME } from '@brewlog/core';

export default function TabLayout() {
  const { colors } = INDUSTRIAL_PRECISION_THEME;

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.panel,
        },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: {
          fontWeight: '700',
        },
        tabBarStyle: {
          backgroundColor: colors.panel,
          borderTopColor: colors.borderSubtle,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Timer',
          tabBarIcon: ({ color, size }) => (
            <Timer size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="recipes"
        options={{
          title: 'Recipes',
          tabBarIcon: ({ color, size }) => (
            <BookOpen size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="stash"
        options={{
          title: 'Stash',
          tabBarIcon: ({ color, size }) => (
            <Coffee size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="equipment"
        options={{
          title: 'Equipment',
          tabBarIcon: ({ color, size }) => (
            <Wrench size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="cupping"
        options={{
          title: 'Cupping',
          tabBarIcon: ({ color, size }) => (
            <Award size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
