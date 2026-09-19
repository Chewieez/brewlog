# Mobile Bottom Tab Navigation Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the single-screen React Native foundation into an idiomatic 5-tab Expo Router bottom navigation shell (`Timer`, `Recipes`, `Stash`, `Equipment`, `Cupping`) with Lucide icons and strict Industrial Precision theme styling.

**Architecture:** Use Expo Router route groups `app/(tabs)/` with a custom-styled `<Tabs>` navigator layout wrapped by the root `<Stack>` layout. Integrate `react-native-svg` and `lucide-react-native` for 1-to-1 visual icon parity with the web app, and strictly consume `INDUSTRIAL_PRECISION_THEME.colors` from `@brewlog/core`.

**Tech Stack:** Expo SDK 57, React Native 0.86.3, React 19.2.8, Expo Router ~57.0.22, `react-native-svg`, `lucide-react-native`, TypeScript 6, `@brewlog/core`.

**Spec:** [`docs/superpowers/specs/2026-09-19-mobile-bottom-tabs-design.md`](file:///Users/greglawrence/Projects/brewlog/docs/superpowers/specs/2026-09-19-mobile-bottom-tabs-design.md)

## Global Constraints

- Pinned React version: `19.2.8` across all monorepo packages.
- Zero raw hex values: All colors must be imported from `INDUSTRIAL_PRECISION_THEME.colors` in `@brewlog/core`.
- Styling approach: Native `StyleSheet.create` (no NativeWind/inline raw styles).
- File hygiene: Every modified or created file must end with exactly one newline.
- Primary landing tab: Timer tab must be the default route at `/`.
- iOS Simulator: Verification target is `iPhone 17 Pro` on iOS 26.

---

### Task 1: Install Native SVG and Lucide Icons in Mobile Workspace

**Files:**
- Modify: `apps/mobile/package.json`
- Modify: `package.json`

**Interfaces:**
- Consumes: NPM registry packages `react-native-svg` (Expo SDK 57 compatible) and `lucide-react-native`.
- Produces: Installed native SVG rendering engine and Lucide icon components for `@brewlog/mobile`.

- [ ] **Step 1: Install `react-native-svg` and `lucide-react-native`**

Run:
```bash
npx expo install react-native-svg --workspace=@brewlog/mobile
npm install lucide-react-native --workspace=@brewlog/mobile
```

- [ ] **Step 2: Verify dependency hygiene with Expo Doctor**

Run:
```bash
cd apps/mobile && npx expo-doctor
```
Expected: All 21 checks pass with no conflicting native dependencies or mismatched versions.

- [ ] **Step 3: Run monorepo typecheck to ensure resolution**

Run:
```bash
npm run typecheck --workspaces
```
Expected: PASS with 0 TypeScript errors across `core`, `mobile`, `supabase`, and `web`.

- [ ] **Step 4: Commit dependencies**

Run:
```bash
/Library/Developer/CommandLineTools/usr/bin/git add apps/mobile/package.json package-lock.json package.json
/Library/Developer/CommandLineTools/usr/bin/git commit -m "feat(mobile): add react-native-svg and lucide-react-native dependencies"
```

---

### Task 2: Configure Root Stack Layout for Tab Route Group

**Files:**
- Modify: `apps/mobile/app/_layout.tsx`

**Interfaces:**
- Consumes: `INDUSTRIAL_PRECISION_THEME` from `@brewlog/core`, `<Stack>` from `expo-router`.
- Produces: Root stack layout presenting the `(tabs)` group with `headerShown: false` and dark canvas background.

- [ ] **Step 1: Update root `_layout.tsx` to mount `(tabs)` with dark canvas styling**

Modify `apps/mobile/app/_layout.tsx`:
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
          headerShown: false,
          contentStyle: {
            backgroundColor: colors.canvas,
          },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </SafeAreaProvider>
  );
}
```

- [ ] **Step 2: Run mobile typecheck to verify route configuration**

Run:
```bash
npm run typecheck --workspace=@brewlog/mobile
```
Expected: PASS with 0 TypeScript errors.

- [ ] **Step 3: Commit root layout update**

Run:
```bash
/Library/Developer/CommandLineTools/usr/bin/git add apps/mobile/app/_layout.tsx
/Library/Developer/CommandLineTools/usr/bin/git commit -m "feat(mobile): configure root stack layout for bottom tabs"
```

---

### Task 3: Implement Native Bottom Tabs Layout with Lucide Icons

**Files:**
- Create: `apps/mobile/app/(tabs)/_layout.tsx`

**Interfaces:**
- Consumes: `Tabs` from `expo-router`, `Timer`, `BookOpen`, `Coffee`, `Wrench`, `Award` from `lucide-react-native`, `INDUSTRIAL_PRECISION_THEME` from `@brewlog/core`.
- Produces: 5 configured tab items with active orange tint (`colors.accent`), muted inactive tint (`colors.textMuted`), dark panel background, and subtle top border.

- [ ] **Step 1: Create `apps/mobile/app/(tabs)/_layout.tsx`**

Write `apps/mobile/app/(tabs)/_layout.tsx`:
```tsx
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
```

- [ ] **Step 2: Run typecheck to verify tabs layout types**

Run:
```bash
npm run typecheck --workspace=@brewlog/mobile
```
Expected: PASS with 0 TypeScript errors.

- [ ] **Step 3: Commit tab layout**

Run:
```bash
/Library/Developer/CommandLineTools/usr/bin/git add apps/mobile/app/\(tabs\)/_layout.tsx
/Library/Developer/CommandLineTools/usr/bin/git commit -m "feat(mobile): create bottom tab layout with lucide icons and industrial styling"
```

---

### Task 4: Implement Tab Screens and Migrate Smoke Features

**Files:**
- Create: `apps/mobile/app/(tabs)/index.tsx`
- Create: `apps/mobile/app/(tabs)/recipes.tsx`
- Create: `apps/mobile/app/(tabs)/stash.tsx`
- Create: `apps/mobile/app/(tabs)/equipment.tsx`
- Create: `apps/mobile/app/(tabs)/cupping.tsx`
- Delete: `apps/mobile/app/index.tsx`

**Interfaces:**
- Consumes: `@brewlog/core` (`calculateWaterAmount`, `DEFAULT_PRESET_RECIPES`, `INDUSTRIAL_PRECISION_THEME`), `lucide-react-native` (`Coffee`, `Wrench`, `Award`).
- Produces: 5 functional tab screens matching the design specification.

- [ ] **Step 1: Create `app/(tabs)/index.tsx` (Timer & Ratio Calculator)**

Write `apps/mobile/app/(tabs)/index.tsx`:
```tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import Constants from 'expo-constants';
import {
  INDUSTRIAL_PRECISION_THEME,
  calculateWaterAmount,
} from '@brewlog/core';

export default function TimerScreen() {
  const [dose, setDose] = useState('18');
  const [ratio, setRatio] = useState('16');

  const doseNum = parseFloat(dose) || 0;
  const ratioNum = parseFloat(ratio) || 0;
  const targetWater = calculateWaterAmount(doseNum, ratioNum);

  const { colors } = INDUSTRIAL_PRECISION_THEME;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 1. Status Card: Environment & Profile */}
      <View style={styles.card}>
        <Text style={styles.cardEyebrow}>TIMER & BREW ASSISTANT</Text>
        <Text style={styles.cardTitle}>Mobile Station Ready</Text>
        <Text style={styles.cardBody}>
          Expo SDK {Constants.expoConfig?.version ?? '57'} on {Platform.OS}.
          Connected to @brewlog/core domain engine.
        </Text>
      </View>

      {/* 2. Interactive Calculator Card: Domain Math */}
      <View style={styles.card}>
        <Text style={styles.cardEyebrow}>WATER RATIO CALCULATOR</Text>
        <Text style={styles.cardTitle}>Dose to Yield</Text>

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

      {/* 3. Quick Action: Start Brew */}
      <Pressable
        style={({ pressed }) => [
          styles.actionButton,
          pressed && styles.actionButtonPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Start Brew Session"
      >
        <Text style={styles.actionButtonText}>Start Brew Session</Text>
      </Pressable>
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
  actionButton: {
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonPressed: {
    opacity: 0.85,
  },
  actionButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
```

- [ ] **Step 2: Create `app/(tabs)/recipes.tsx` (Recipe Catalog)**

Write `apps/mobile/app/(tabs)/recipes.tsx`:
```tsx
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import {
  INDUSTRIAL_PRECISION_THEME,
  DEFAULT_PRESET_RECIPES,
} from '@brewlog/core';

export default function RecipesScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerEyebrow}>RECIPE CATALOG</Text>
        <Text style={styles.headerTitle}>Curated Brew Profiles</Text>
        <Text style={styles.headerSubtitle}>
          Industry-tested recipes synced from @brewlog/core.
        </Text>
      </View>

      {DEFAULT_PRESET_RECIPES.map((recipe) => (
        <View key={recipe.id} style={styles.recipeCard}>
          <View style={styles.recipeHeader}>
            <Text style={styles.recipeName}>{recipe.name}</Text>
            <View style={styles.methodBadge}>
              <Text style={styles.methodBadgeText}>
                {recipe.brewMethod.toUpperCase()}
              </Text>
            </View>
          </View>

          <Text style={styles.recipeDescription}>{recipe.description}</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>DOSE</Text>
              <Text style={styles.metaValue}>{recipe.coffeeDoseGrams}g</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>RATIO</Text>
              <Text style={styles.metaValue}>1:{recipe.ratio}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>WATER</Text>
              <Text style={styles.metaValue}>{recipe.targetWaterGrams}g</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>TEMP</Text>
              <Text style={styles.metaValue}>{recipe.waterTempC}°C</Text>
            </View>
          </View>
        </View>
      ))}
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
  header: {
    marginBottom: 4,
  },
  headerEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  recipeCard: {
    backgroundColor: colors.panel,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 16,
    gap: 12,
  },
  recipeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recipeName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  methodBadge: {
    backgroundColor: colors.panelRecessed,
    borderColor: colors.borderSubtle,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  methodBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 0.8,
  },
  recipeDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.panelRecessed,
    borderRadius: 6,
    padding: 10,
  },
  metaItem: {
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
```

- [ ] **Step 3: Create `app/(tabs)/stash.tsx` (Coffee Stash)**

Write `apps/mobile/app/(tabs)/stash.tsx`:
```tsx
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Coffee } from 'lucide-react-native';
import { INDUSTRIAL_PRECISION_THEME } from '@brewlog/core';

export default function StashScreen() {
  const { colors } = INDUSTRIAL_PRECISION_THEME;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.placeholderCard}>
        <View style={styles.iconWrapper}>
          <Coffee size={36} color={colors.accent} />
        </View>
        <Text style={styles.eyebrow}>INVENTORY & CELLAR</Text>
        <Text style={styles.title}>Coffee Bean Stash</Text>
        <Text style={styles.description}>
          Track roasters, roast dates, origins, varieties, process methods, and remaining gram weights.
        </Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>PHASE 3B • CLOUD SYNC COMING</Text>
        </View>
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
    flexGrow: 1,
    justifyContent: 'center',
  },
  placeholderCard: {
    backgroundColor: colors.panel,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  badge: {
    marginTop: 8,
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
});
```

- [ ] **Step 4: Create `app/(tabs)/equipment.tsx` (Equipment Locker)**

Write `apps/mobile/app/(tabs)/equipment.tsx`:
```tsx
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Wrench } from 'lucide-react-native';
import { INDUSTRIAL_PRECISION_THEME } from '@brewlog/core';

export default function EquipmentScreen() {
  const { colors } = INDUSTRIAL_PRECISION_THEME;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.placeholderCard}>
        <View style={styles.iconWrapper}>
          <Wrench size={36} color={colors.accent} />
        </View>
        <Text style={styles.eyebrow}>HARDWARE LOCKER</Text>
        <Text style={styles.title}>Brewers & Grinders</Text>
        <Text style={styles.description}>
          Manage your grinder calibration clicks, burr sets, pourover drippers, espresso pressure profiles, and water recipes.
        </Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>PHASE 3B • CLOUD SYNC COMING</Text>
        </View>
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
    flexGrow: 1,
    justifyContent: 'center',
  },
  placeholderCard: {
    backgroundColor: colors.panel,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  badge: {
    marginTop: 8,
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
});
```

- [ ] **Step 5: Create `app/(tabs)/cupping.tsx` (SCA Cupping)**

Write `apps/mobile/app/(tabs)/cupping.tsx`:
```tsx
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Award } from 'lucide-react-native';
import { INDUSTRIAL_PRECISION_THEME } from '@brewlog/core';

export default function CuppingScreen() {
  const { colors } = INDUSTRIAL_PRECISION_THEME;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.placeholderCard}>
        <View style={styles.iconWrapper}>
          <Award size={36} color={colors.accent} />
        </View>
        <Text style={styles.eyebrow}>SENSORY PROTOCOL</Text>
        <Text style={styles.title}>SCA Cupping Form</Text>
        <Text style={styles.description}>
          Standardized 10-attribute specialty coffee cupping score sheets: Fragrance/Aroma, Flavor, Aftertaste, Acidity, Body, Balance, Uniformity, Clean Cup, Sweetness, and Defects.
        </Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>PHASE 3B • SENSORY ENGINE COMING</Text>
        </View>
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
    flexGrow: 1,
    justifyContent: 'center',
  },
  placeholderCard: {
    backgroundColor: colors.panel,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  badge: {
    marginTop: 8,
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
});
```

- [ ] **Step 6: Remove old standalone `apps/mobile/app/index.tsx`**

Run:
```bash
rm apps/mobile/app/index.tsx
```

- [ ] **Step 7: Run typecheck and existing tests across monorepo**

Run:
```bash
npm run typecheck --workspaces
npm test --workspaces
```
Expected: PASS with 0 TypeScript errors and 132/132 tests passing.

- [ ] **Step 8: Commit tab screens and migration**

Run:
```bash
/Library/Developer/CommandLineTools/usr/bin/git add apps/mobile/app/\(tabs\)/ apps/mobile/app/index.tsx
/Library/Developer/CommandLineTools/usr/bin/git commit -m "feat(mobile): implement 5 tab screens and migrate smoke features"
```

---

### Task 5: End-to-End Metro Bundling, Doctor Audit, and Simulator Verification

**Files:**
- Modify: `docs/ROADMAP.md`
- Create: `docs/devlogs/2026-09-19-phase-3a-mobile-bottom-tabs.md`
- Update: `walkthrough.md`

**Interfaces:**
- Consumes: All mobile screens, Metro bundler, iOS Simulator `iPhone 17 Pro`.
- Produces: Production bundle verification, passing Expo Doctor audit, running simulator preview, and updated project documentation.

- [ ] **Step 1: Run Expo Doctor audit**

Run:
```bash
cd apps/mobile && npx expo-doctor
```
Expected: All 21 checks pass.

- [ ] **Step 2: Run iOS and Android Metro export tests**

Run:
```bash
cd apps/mobile && EXPO_NO_TELEMETRY=1 npx expo export --platform ios --no-bytecode
cd apps/mobile && EXPO_NO_TELEMETRY=1 npx expo export --platform android --no-bytecode
rm -rf apps/mobile/dist
```
Expected: Both export bundles succeed with 0 bundle errors.

- [ ] **Step 3: Launch app in iOS Simulator and capture preview**

Run:
```bash
npm run dev:mobile
```
Verify:
1. Tap across all 5 tabs: Timer (`/`), Recipes (`/recipes`), Stash (`/stash`), Equipment (`/equipment`), Cupping (`/cupping`).
2. Verify active orange tint and inactive muted tint on tab bar icons and labels.
3. Test interactive ratio calculator on Timer tab.
4. Capture simulator screenshot using `xcrun simctl io booted screenshot`.

- [ ] **Step 4: Update devlog and roadmap**

Record completion of Phase 3A in `docs/ROADMAP.md` and add devlog `docs/devlogs/2026-09-19-phase-3a-mobile-bottom-tabs.md`.

- [ ] **Step 5: Commit Phase 3A completion**

Run:
```bash
/Library/Developer/CommandLineTools/usr/bin/git add docs/ROADMAP.md docs/devlogs/2026-09-19-phase-3a-mobile-bottom-tabs.md
/Library/Developer/CommandLineTools/usr/bin/git commit -m "docs: document Phase 3A mobile bottom tabs completion"
```
