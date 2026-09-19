# React Native Mobile Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the React Native Expo mobile app (`apps/mobile`) in the BrewLog monorepo, configure Metro for workspace resolution with `@brewlog/core`, set up Expo Router, and build an interactive Smoke Screen demonstrating native primitives, theme tokens, and domain calculations.

**Architecture:** Initialize `apps/mobile` with Expo SDK 57 and React 19. Configure `metro.config.js` with Expo's built-in monorepo workspace resolver to import `@brewlog/core`. Set up Expo Router with a root Stack layout and safe area handling, and create an educational Smoke Screen in `app/index.tsx` using React Native primitives (`ScrollView`, `View`, `Text`, `TextInput`, `Pressable`) and `StyleSheet.create` with `INDUSTRIAL_PRECISION_THEME`.

**Tech Stack:** Expo SDK 57, React Native 0.86, React 19, Expo Router 57, TypeScript 5.7, `@brewlog/core`

**Spec:** `docs/superpowers/specs/2026-09-18-react-native-mobile-foundation-design.md`

## Global Constraints

- **Expo SDK**: `~57.0.24`
- **React**: `19.2.3`
- **React Native**: `0.86.3`
- **Expo Router**: `~57.0.22`
- **Styling**: React Native core `StyleSheet.create` strictly consuming `INDUSTRIAL_PRECISION_THEME.colors` from `@brewlog/core`
- **Entry Point**: `"main": "expo-router/entry"` in `apps/mobile/package.json`
- **Zero Impact on Web**: `@brewlog/web`, `packages/core`, and `packages/supabase` must continue to pass all tests and typechecks without regressions.

---

### Task 1: Initialize Workspace Configuration and Install Dependencies

**Files:**
- Create: `apps/mobile/package.json`
- Create: `apps/mobile/app.json`
- Create: `apps/mobile/tsconfig.json`
- Create: `apps/mobile/metro.config.js`

**Interfaces:**
- Consumes: `@brewlog/core` workspace package
- Produces: Runnable Expo SDK 57 project structure in `apps/mobile`

- [ ] **Step 1: Create `apps/mobile/package.json`**

Write `apps/mobile/package.json` with the exact SDK 57 dependency set and monorepo workspace reference:

```json
{
  "name": "@brewlog/mobile",
  "version": "0.1.0",
  "private": true,
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@brewlog/core": "*",
    "expo": "~57.0.24",
    "expo-constants": "~18.0.1",
    "expo-router": "~57.0.22",
    "expo-status-bar": "~57.0.1",
    "react": "19.2.3",
    "react-native": "0.86.3",
    "react-native-safe-area-context": "^5.6.2",
    "react-native-screens": "^4.23.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "typescript": "^5.7.3"
  }
}
```

- [ ] **Step 2: Create `apps/mobile/app.json`**

Write `apps/mobile/app.json` configuring Expo app metadata and schemes:

```json
{
  "expo": {
    "name": "BrewLog",
    "slug": "brewlog",
    "version": "0.1.0",
    "orientation": "portrait",
    "userInterfaceStyle": "dark",
    "scheme": "brewlog",
    "newArchEnabled": true,
    "ios": {
      "supportsTablet": true
    },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#121214"
      }
    },
    "plugins": [
      "expo-router"
    ]
  }
}
```

- [ ] **Step 3: Create `apps/mobile/tsconfig.json`**

Write `apps/mobile/tsconfig.json` extending Expo's base config:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true
  }
}
```

- [ ] **Step 4: Create `apps/mobile/metro.config.js`**

Write `apps/mobile/metro.config.js` utilizing Expo's automatic monorepo resolution:

```javascript
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = config;
```

- [ ] **Step 5: Run `npm install` and verify dependencies**

Run `npm install` from repository root:
Run: `npm install`
Expected: Successfully installs dependencies and creates workspace symlinks for `@brewlog/mobile`.

- [ ] **Step 6: Run `npx expo-doctor` diagnostic check**

Run: `npx expo-doctor` in `apps/mobile` (or `npm run --prefix apps/mobile exec expo-doctor`)
Expected: All checks pass or note valid peer alignment.

- [ ] **Step 7: Commit configuration**

```bash
git add apps/mobile/package.json apps/mobile/app.json apps/mobile/tsconfig.json apps/mobile/metro.config.js package-lock.json
git commit -m "chore(mobile): scaffold Expo SDK 57 project and Metro monorepo configuration"
```

---

### Task 2: Configure Expo Router Root Stack Layout

**Files:**
- Create: `apps/mobile/app/_layout.tsx`

**Interfaces:**
- Consumes: `INDUSTRIAL_PRECISION_THEME` from `@brewlog/core`, `Stack` from `expo-router`, `SafeAreaProvider` from `react-native-safe-area-context`
- Produces: Root layout wrapper for all mobile routes

- [ ] **Step 1: Create `apps/mobile/app/_layout.tsx`**

Write `apps/mobile/app/_layout.tsx`:

```tsx
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
```

- [ ] **Step 2: Verify layout typecheck**

Run: `npm run typecheck --workspace=@brewlog/mobile`
Expected: TypeScript passes with 0 errors.

- [ ] **Step 3: Commit root layout**

```bash
git add apps/mobile/app/_layout.tsx
git commit -m "feat(mobile): add Expo Router root stack layout with industrial theme"
```

---

### Task 3: Build the Interactive Smoke Screen

**Files:**
- Create: `apps/mobile/app/index.tsx`

**Interfaces:**
- Consumes: `INDUSTRIAL_PRECISION_THEME`, `calculateWaterFromRatio`, `PRESET_RECIPES` from `@brewlog/core`
- Produces: First interactive screen demonstrating native primitives, theme colors, and domain calculation

- [ ] **Step 1: Create `apps/mobile/app/index.tsx`**

Write `apps/mobile/app/index.tsx`:

```tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import Constants from 'expo-constants';
import {
  INDUSTRIAL_PRECISION_THEME,
  calculateWaterFromRatio,
  PRESET_RECIPES,
} from '@brewlog/core';

export default function SmokeScreen() {
  const [dose, setDose] = useState('18');
  const [ratio, setRatio] = useState('16');

  const doseNum = parseFloat(dose) || 0;
  const ratioNum = parseFloat(ratio) || 0;
  const targetWater = calculateWaterFromRatio(doseNum, ratioNum);

  const { colors } = INDUSTRIAL_PRECISION_THEME;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 1. Header Card: Environment Verification */}
      <View style={styles.card}>
        <Text style={styles.cardEyebrow}>ENVIRONMENT CHECK</Text>
        <Text style={styles.cardTitle}>Mobile Foundation Ready</Text>
        <Text style={styles.cardBody}>
          Expo SDK {Constants.expoConfig?.version ?? '57'} running on {Platform.OS}.
          Workspace link active with @brewlog/core.
        </Text>
      </View>

      {/* 2. Interactive Calculator Card: Domain Math Verification */}
      <View style={styles.card}>
        <Text style={styles.cardEyebrow}>DOMAIN LOGIC PROOF</Text>
        <Text style={styles.cardTitle}>Water Ratio Calculator</Text>

        <View style={styles.inputRow}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>DOSE (G)</Text>
            <TextInput
              style={styles.input}
              value={dose}
              onChangeText={setDose}
              keyboardType="numeric"
              placeholderTextColor={colors.textMuted}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>RATIO (1:X)</Text>
            <TextInput
              style={styles.input}
              value={ratio}
              onChangeText={setRatio}
              keyboardType="numeric"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>

        <View style={styles.resultBox}>
          <Text style={styles.resultLabel}>TARGET WATER</Text>
          <Text style={styles.resultValue}>{targetWater.toFixed(1)}g</Text>
        </View>
      </View>

      {/* 3. Preset Recipes List: Data Models Verification */}
      <View style={styles.card}>
        <Text style={styles.cardEyebrow}>SHARED DATA MODELS</Text>
        <Text style={styles.cardTitle}>Core Recipe Presets</Text>
        {PRESET_RECIPES.map((recipe) => (
          <View key={recipe.id} style={styles.recipeRow}>
            <View>
              <Text style={styles.recipeName}>{recipe.name}</Text>
              <Text style={styles.recipeMethod}>
                {recipe.method} • {recipe.ratio}
              </Text>
            </View>
            <Text style={styles.recipeDose}>{recipe.coffeeDoseGrams}g</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const { colors } = INDUSTRIAL_PRECISION_THEME;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: colors.panel,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 16,
  },
  cardEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  cardBody: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  input: {
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 6,
    color: colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
  },
  resultBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.panelRecessed,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  resultValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.accent,
  },
  recipeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  recipeName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  recipeMethod: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  recipeDose: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
});
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck --workspace=@brewlog/mobile`
Expected: 0 errors.

- [ ] **Step 3: Commit Smoke Screen**

```bash
git add apps/mobile/app/index.tsx
git commit -m "feat(mobile): add interactive smoke screen with industrial precision theme"
```

---

### Task 4: Monorepo Verification & Bundle Export Test

**Files:**
- N/A (Verification across monorepo)

**Interfaces:**
- Validates: Entire monorepo builds, typechecks, and passes tests without regressions

- [ ] **Step 1: Run full monorepo typecheck**

Run: `npm run typecheck`
Expected: Passes across `@brewlog/core`, `@brewlog/supabase`, `@brewlog/web`, and `@brewlog/mobile`.

- [ ] **Step 2: Run existing unit test suites**

Run: `npm run test`
Expected: All tests in `@brewlog/core`, `@brewlog/supabase`, and `@brewlog/web` pass.

- [ ] **Step 3: Test Metro bundling resolution**

Run: `npx expo export --platform web --clear` in `apps/mobile`
Expected: Successfully exports bundle into `apps/mobile/dist` without missing modules or bundling errors.
Clean up the generated `apps/mobile/dist` or add it to `.gitignore`.

- [ ] **Step 4: Update `.gitignore` if needed**

Ensure `.expo/`, `apps/mobile/dist/`, and mobile cache folders are ignored.

- [ ] **Step 5: Commit verification updates**

```bash
git add .gitignore
git commit -m "chore(mobile): configure gitignore for Expo artifacts"
```
