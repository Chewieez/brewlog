import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { INDUSTRIAL_PRECISION_THEME } from '@brewlog/core';

const { colors } = INDUSTRIAL_PRECISION_THEME;

export default function RecipeBuilderRoute() {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholderText}>Recipe Builder</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: colors.textPrimary,
    fontSize: 16,
  },
});
