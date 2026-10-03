# Mobile Equipment & Web Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete Equipment catalog and Add/Edit modal flow on mobile with offline-first persistence and Supabase sync, and update the web Equipment view for full visual and functional parity (search, category filter chips, inline editing, and favorite starring).

**Architecture:** 
1. `@brewlog/core` exports canonical starter gear (`DEFAULT_INITIAL_EQUIPMENT`) consumed by both web and mobile.
2. Mobile implements `EquipmentContext` (`AsyncStorage` key `@brewlog/mobile:equipment_cache`, offline pending sync queues, Supabase `equipment` sync) registered in `apps/mobile/app/_layout.tsx`.
3. Mobile catalog (`EquipmentCatalogScreen.tsx` in `app/(tabs)/equipment.tsx`) features `BREW GEAR` eyebrow, `Equipment` title, search, filter chips (`All`, `Grinders`, `Brewers`, `Scales`, `Kettles`), grouped category sections matching web, and `EquipmentCard` with favorite star.
4. Mobile Add/Edit modal (`EquipmentModalScreen.tsx` in `app/equipment/modal.tsx`) uses `KeyboardAwareScrollView` from `react-native-keyboard-controller` (`bottomOffset={32}`), dirty check with discard alert, and delete confirmation in edit mode.
5. Web (`useEquipment.ts` and `EquipmentView.tsx`) updates with `updateEquipment`, `toggleFavorite`, search bar, category chips, card edit modal, and card favorite stars.

**Tech Stack:** React Native 0.86, Expo Router 57, React 19, TypeScript, `react-native-keyboard-controller`, `lucide-react-native`, `lucide-react`, Vitest, Supabase.

**Spec:** [`docs/superpowers/specs/2026-10-03-mobile-equipment-design.md`](file:///Users/greglawrence/Projects/brewlog/docs/superpowers/specs/2026-10-03-mobile-equipment-design.md)

## Global Constraints

- Wording: Do NOT use "Hardware" or "Locker". Eyebrow is `BREW GEAR`. Title is `Equipment`. Subtitle is `Manage your grinders, brewers, scales, and kettles.`. Action button is `ADD EQUIPMENT`.
- Scrolling: Use `KeyboardAwareScrollView` from `react-native-keyboard-controller` with `bottomOffset={32}`, `keyboardShouldPersistTaps="handled"`, wrapped in `SafeAreaView edges={['top']}`.
- Parity: Equipment functionality and fields must match between web and mobile (Type, Brand, Model, SubType, Grinder Setting Scale Type, Favorite, Notes).
- Testing rule: Never run the broad/full test suite for small intermediate tasks. Run only the targeted single test file for each task. Run full test suites only in the final verification gate before commit/push.

---

### Task 1: Starter Presets in `@brewlog/core`

**Files:**
- Modify: `packages/core/src/presets.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/src/presets.test.ts`

**Interfaces:**
- Produces: `DEFAULT_INITIAL_EQUIPMENT: Equipment[]` exported from `@brewlog/core`.

- [ ] **Step 1: Write the failing test in `presets.test.ts`**

Add test checking `DEFAULT_INITIAL_EQUIPMENT`:
```typescript
import { DEFAULT_INITIAL_EQUIPMENT, Equipment } from './index';

describe('DEFAULT_INITIAL_EQUIPMENT', () => {
  it('should export 7 canonical starter equipment items', () => {
    expect(DEFAULT_INITIAL_EQUIPMENT).toHaveLength(7);
  });

  it('should include grinders, brewers, scales, and kettles', () => {
    const types = DEFAULT_INITIAL_EQUIPMENT.map((e) => e.type);
    expect(types).toContain('grinder');
    expect(types).toContain('brewer');
    expect(types).toContain('scale');
    expect(types).toContain('kettle');
  });

  it('should have required fields and default favorite status', () => {
    DEFAULT_INITIAL_EQUIPMENT.forEach((item: Equipment) => {
      expect(item.id).toBeDefined();
      expect(item.brand).toBeTruthy();
      expect(item.model).toBeTruthy();
      expect(item.type).toBeTruthy();
      expect(item.isFavorite).toBe(true);
      expect(item.createdAt).toBeDefined();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/core/src/presets.test.ts`
Expected: FAIL ("DEFAULT_INITIAL_EQUIPMENT is not defined")

- [ ] **Step 3: Implement `DEFAULT_INITIAL_EQUIPMENT` in `packages/core/src/presets.ts`**

```typescript
export const DEFAULT_INITIAL_EQUIPMENT: Equipment[] = [
  {
    id: 'eq-1',
    type: 'grinder',
    brand: 'Fellow',
    model: 'Ode Gen 2',
    subType: 'flat-burr',
    settingScaleType: 'stepped-numbers',
    isFavorite: true,
    notes: '64mm Gen 2 burrs. 4.1 for standard V60.',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'eq-2',
    type: 'grinder',
    brand: 'Comandante',
    model: 'C40 MK4 Nitro Blade',
    subType: 'conical-burr',
    settingScaleType: 'clicks',
    isFavorite: true,
    notes: '22-26 clicks for pour-over, 12 clicks for AeroPress.',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'eq-3',
    type: 'brewer',
    brand: 'Hario',
    model: 'V60 02 (Clear Plastic)',
    subType: 'pour-over',
    isFavorite: true,
    notes: 'Plastic retains temperature best during brew.',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'eq-4',
    type: 'brewer',
    brand: 'AeroPress',
    model: 'AeroPress Clear',
    subType: 'immersion',
    isFavorite: true,
    notes: 'Standard immersion with metal/paper filters.',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'eq-5',
    type: 'brewer',
    brand: 'Flair',
    model: 'Flair 58+',
    subType: 'lever-espresso',
    isFavorite: true,
    notes: '58mm commercial portafilter manual lever espresso machine.',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'eq-6',
    type: 'scale',
    brand: 'Timemore',
    model: 'Black Mirror Basic 2',
    subType: 'smart-scale',
    isFavorite: true,
    notes: '0.1g resolution with auto-flow rate and auto-timer.',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'eq-7',
    type: 'kettle',
    brand: 'Fellow',
    model: 'Stagg EKG (0.9L)',
    subType: 'gooseneck-electric',
    isFavorite: true,
    notes: 'Precision gooseneck pour with PID temperature hold.',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];
```

Ensure `packages/core/src/index.ts` exports `DEFAULT_INITIAL_EQUIPMENT`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run packages/core/src/presets.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/presets.ts packages/core/src/index.ts packages/core/src/presets.test.ts
git commit -m "feat(core): export DEFAULT_INITIAL_EQUIPMENT starter presets"
```

---

### Task 2: Mobile `EquipmentContext` & Layout Registration

**Files:**
- Create: `apps/mobile/src/features/equipment/EquipmentContext.tsx`
- Test: `apps/mobile/src/features/equipment/EquipmentContext.test.tsx`
- Modify: `apps/mobile/app/_layout.tsx`

**Interfaces:**
- Consumes: `Equipment`, `DEFAULT_INITIAL_EQUIPMENT` from `@brewlog/core`, `mapEquipmentRowToDomain`, `mapEquipmentDomainToInsert` from `@brewlog/supabase`.
- Produces: `EquipmentContext`, `EquipmentProvider`, `useEquipment` hook exporting:
  `{ equipment, grinders, brewers, scales, kettles, loading, addEquipment, updateEquipment, deleteEquipment, toggleFavorite, refreshEquipment }`.

- [ ] **Step 1: Write the failing tests in `EquipmentContext.test.tsx`**

Test scenarios:
1. Loads cached equipment from `AsyncStorage`.
2. Seeds `DEFAULT_INITIAL_EQUIPMENT` when cache is empty.
3. `addEquipment` adds an item and writes to `AsyncStorage`.
4. `updateEquipment` modifies existing item in state and cache.
5. `toggleFavorite` flips `isFavorite` boolean.
6. `deleteEquipment` removes item from state and cache.
7. Syncs offline items to Supabase when user is logged in.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/mobile/src/features/equipment/EquipmentContext.test.tsx`
Expected: FAIL ("Cannot find module EquipmentContext")

- [ ] **Step 3: Implement `EquipmentContext.tsx`**

Create `apps/mobile/src/features/equipment/EquipmentContext.tsx`:
- Storage keys:
  - `EQUIPMENT_STORAGE_KEY = '@brewlog/mobile:equipment_cache'`
  - `EQUIPMENT_PENDING_UPDATES_KEY = '@brewlog/mobile:equipment_pending_updates'`
  - `EQUIPMENT_PENDING_DELETES_KEY = '@brewlog/mobile:equipment_pending_deletes'`
- Helper functions to load/save cache and pending queues via `AsyncStorage`.
- `addEquipment`: generates `local-eq-${Date.now()}` when offline, or inserts to Supabase when online.
- `updateEquipment`: optimistically updates state, tracks pending sync if offline or performs `supabase.from('equipment').update(...)` when online.
- `deleteEquipment`: removes from state, tracks pending delete or performs `supabase.from('equipment').delete(...)` when online.
- `toggleFavorite`: toggles `isFavorite` via `updateEquipment`.
- `refreshEquipment`: flushes pending updates/deletes and queries latest rows from Supabase if authenticated.
- Memoized filtered lists: `grinders`, `brewers`, `scales`, `kettles`.
- Export `useEquipment()` hook with context validation.

- [ ] **Step 4: Register `EquipmentProvider` in `apps/mobile/app/_layout.tsx`**

Import `EquipmentProvider` and wrap inside `RootLayout`:
```tsx
<AuthProvider>
  <RecipeProvider>
    <StashProvider>
      <EquipmentProvider>
        ...
      </EquipmentProvider>
    </StashProvider>
  </RecipeProvider>
</AuthProvider>
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run apps/mobile/src/features/equipment/EquipmentContext.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/features/equipment/EquipmentContext.tsx apps/mobile/src/features/equipment/EquipmentContext.test.tsx apps/mobile/app/_layout.tsx
git commit -m "feat(mobile): add EquipmentContext with offline persistence and Supabase sync"
```

---

### Task 3: Mobile `EquipmentCard` Component

**Files:**
- Create: `apps/mobile/src/features/equipment/components/EquipmentCard.tsx`
- Test: `apps/mobile/src/features/equipment/components/EquipmentCard.test.tsx`

**Interfaces:**
- Consumes: `Equipment` from `@brewlog/core`, `INDUSTRIAL_PRECISION_THEME`, `FONTS`.
- Produces: `EquipmentCard: React.FC<{ equipment: Equipment; onPress: (item: Equipment) => void; onToggleFavorite?: (item: Equipment) => void }>`

- [ ] **Step 1: Write the failing tests in `EquipmentCard.test.tsx`**

Test scenarios:
1. Renders brand name, model name, and spec badges (`subType`, `settingScaleType`).
2. Renders notes if present.
3. Renders Star icon filled when `isFavorite: true` and outlined when `false`.
4. Pressing the card triggers `onPress(item)`.
5. Pressing the Star icon triggers `onToggleFavorite(item)` without triggering `onPress`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/mobile/src/features/equipment/components/EquipmentCard.test.tsx`
Expected: FAIL ("Cannot find module EquipmentCard")

- [ ] **Step 3: Implement `EquipmentCard.tsx`**

```tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';
import { Equipment, INDUSTRIAL_PRECISION_THEME } from '@brewlog/core';
import { FONTS } from '../../../theme/fonts';

const { colors } = INDUSTRIAL_PRECISION_THEME;

export interface EquipmentCardProps {
  equipment: Equipment;
  onPress: (item: Equipment) => void;
  onToggleFavorite?: (item: Equipment) => void;
}

export const EquipmentCard: React.FC<EquipmentCardProps> = ({
  equipment,
  onPress,
  onToggleFavorite,
}) => {
  return (
    <Pressable
      style={styles.card}
      onPress={() => onPress(equipment)}
      accessibilityRole="button"
      accessibilityLabel={`${equipment.brand} ${equipment.model}`}
    >
      <View style={styles.headerRow}>
        <Text style={styles.brandText}>{equipment.brand}</Text>
        <View style={styles.badgesRow}>
          {equipment.settingScaleType && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{equipment.settingScaleType}</Text>
            </View>
          )}
          {equipment.subType && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{equipment.subType}</Text>
            </View>
          )}
          {onToggleFavorite && (
            <Pressable
              onPress={(e) => {
                e.stopPropagation?.();
                onToggleFavorite(equipment);
              }}
              style={styles.starButton}
              accessibilityRole="button"
              accessibilityLabel={equipment.isFavorite ? 'Unfavorite equipment' : 'Favorite equipment'}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Star
                size={18}
                color={equipment.isFavorite ? colors.accent : colors.textMuted}
                fill={equipment.isFavorite ? colors.accent : 'none'}
              />
            </Pressable>
          )}
        </View>
      </View>

      <Text style={styles.modelText}>{equipment.model}</Text>

      {equipment.notes ? (
        <Text style={styles.notesText} numberOfLines={2}>
          {equipment.notes}
        </Text>
      ) : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 8,
    padding: 14,
    gap: 6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandText: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    color: colors.accent,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontFamily: FONTS.monoRegular,
    fontSize: 10,
    color: colors.textSecondary,
  },
  starButton: {
    padding: 2,
  },
  modelText: {
    fontFamily: FONTS.sansBold,
    fontSize: 16,
    color: colors.textPrimary,
  },
  notesText: {
    fontFamily: FONTS.sansRegular,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
    marginTop: 2,
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run apps/mobile/src/features/equipment/components/EquipmentCard.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/equipment/components/EquipmentCard.tsx apps/mobile/src/features/equipment/components/EquipmentCard.test.tsx
git commit -m "feat(mobile): create EquipmentCard component with badges and favorite toggle"
```

---

### Task 4: Mobile `EquipmentCatalogScreen` & Tab Route

**Files:**
- Create: `apps/mobile/src/features/equipment/screens/EquipmentCatalogScreen.tsx`
- Test: `apps/mobile/src/features/equipment/screens/EquipmentCatalogScreen.test.tsx`
- Modify: `apps/mobile/app/(tabs)/equipment.tsx`

**Interfaces:**
- Consumes: `useEquipment` hook, `EquipmentCard`, `INDUSTRIAL_PRECISION_THEME`, `FONTS`.
- Produces: `EquipmentCatalogScreen: React.FC` rendered inside `apps/mobile/app/(tabs)/equipment.tsx`.

- [ ] **Step 1: Write the failing tests in `EquipmentCatalogScreen.test.tsx`**

Test scenarios:
1. Renders `BREW GEAR` eyebrow, `Equipment` title, `Manage your grinders, brewers, scales, and kettles.` subtitle, and `ADD EQUIPMENT` button.
2. Renders all 4 category sections with item counts when `All` filter chip is active (`Sliders` Grinders, `Coffee` Brewers & Drippers, `Scale` Precision Scales, `Flame` Kettles & Water Gear).
3. Filters displayed items when search query is entered.
4. Filters to a single category when category chip (`Grinders`, `Brewers`, etc.) is clicked.
5. Tapping `ADD EQUIPMENT` calls `router.push('/equipment/modal')`.
6. Tapping an equipment card calls `router.push({ pathname: '/equipment/modal', params: { id: item.id } })`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/mobile/src/features/equipment/screens/EquipmentCatalogScreen.test.tsx`
Expected: FAIL ("Cannot find module EquipmentCatalogScreen")

- [ ] **Step 3: Implement `EquipmentCatalogScreen.tsx`**

Create `apps/mobile/src/features/equipment/screens/EquipmentCatalogScreen.tsx`:
- State: `searchQuery: string`, `selectedCategory: 'all' | 'grinder' | 'brewer' | 'scale' | 'kettle'`.
- Header:
  - `BREW GEAR` mono eyebrow.
  - `Equipment` bold title.
  - `Manage your grinders, brewers, scales, and kettles.` subtitle.
  - `ADD EQUIPMENT` button leading to `/equipment/modal`.
- Search bar:
  - TextInput with Search icon and clear `X` button.
- Horizontal Category Chips:
  - `All`, `Grinders`, `Brewers`, `Scales`, `Kettles`.
- Sections:
  - When `All`: renders each category with its icon, title, count, list of `EquipmentCard`, and empty card if zero.
  - When specific category: renders only that category's cards.
- Search / Global empty state when zero matches.
- Replace placeholder in `apps/mobile/app/(tabs)/equipment.tsx` to render `<EquipmentCatalogScreen />`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run apps/mobile/src/features/equipment/screens/EquipmentCatalogScreen.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/equipment/screens/EquipmentCatalogScreen.tsx apps/mobile/src/features/equipment/screens/EquipmentCatalogScreen.test.tsx apps/mobile/app/(tabs)/equipment.tsx
git commit -m "feat(mobile): implement EquipmentCatalogScreen with search, category chips, and sectioned cards"
```

---

### Task 5: Mobile `EquipmentModalScreen` & Modal Route

**Files:**
- Create: `apps/mobile/src/features/equipment/screens/EquipmentModalScreen.tsx`
- Create: `apps/mobile/app/equipment/modal.tsx`
- Modify: `apps/mobile/app/_layout.tsx`
- Test: `apps/mobile/src/features/equipment/screens/EquipmentModalScreen.test.tsx`

**Interfaces:**
- Consumes: `useEquipment`, `useLocalSearchParams<{ id?: string }>()`, `KeyboardAwareScrollView` from `react-native-keyboard-controller`.
- Produces: `EquipmentModalScreen: React.FC` handling Add and Edit flows.

- [ ] **Step 1: Write the failing tests in `EquipmentModalScreen.test.tsx`**

Test scenarios:
1. Renders empty form with `NEW EQUIPMENT` title when no `id` param is provided.
2. Renders pre-filled form with `EDIT EQUIPMENT` title when `id` matches existing gear.
3. Shows validation alert / error message if Brand or Model is empty on save.
4. Calling Save executes `addEquipment` or `updateEquipment` and `router.back()`.
5. Pressing Cancel when dirty shows `Alert.alert('Discard Changes?')`.
6. Pressing Cancel when clean calls `router.back()` directly.
7. In Edit mode, renders "DELETE EQUIPMENT" button; tapping prompts `Alert.alert('Delete Equipment?')`, and confirming executes `deleteEquipment(id)` and `router.back()`.
8. Uses `KeyboardAwareScrollView` with mocked scroll methods (`scrollToEnd`/`scrollTo`).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/mobile/src/features/equipment/screens/EquipmentModalScreen.test.tsx`
Expected: FAIL ("Cannot find module EquipmentModalScreen")

- [ ] **Step 3: Implement `EquipmentModalScreen.tsx`**

Create `apps/mobile/src/features/equipment/screens/EquipmentModalScreen.tsx`:
- Read `id` from `useLocalSearchParams<{ id?: string }>()`.
- Initialize form states:
  - `type`: `grinder` | `brewer` | `scale` | `kettle`
  - `brand`: string
  - `model`: string
  - `subType`: string
  - `settingScaleType`: `stepped-numbers` | `clicks` | `stepless`
  - `isFavorite`: boolean
  - `notes`: string
- Dirty check comparing current values against `initialValues`.
- `handleCancel`: checks `isDirty`; shows `Alert.alert('Discard Changes?', ...)` or calls `router.back()`.
- `handleSave`: validates `brand.trim()` and `model.trim()`, calls `addEquipment` or `updateEquipment`, and calls `router.back()`.
- `handleDelete`: shows `Alert.alert('Delete Equipment', ...)`; calls `deleteEquipment(sourceItem.id)` and `router.back()`.
- Layout:
  - `<SafeAreaView style={styles.safeArea} edges={['top']}>`
  - `<KeyboardAwareScrollView style={styles.container} contentContainerStyle={styles.content} bottomOffset={32} keyboardShouldPersistTaps="handled">`
  - Navigation header: `X` cancel, `NEW EQUIPMENT` / `EDIT EQUIPMENT`, `Check` save.
  - Category selector pills (`Grinder`, `Brewer`, `Scale`, `Kettle`).
  - Brand name input (dynamic placeholder based on category).
  - Model name input (dynamic placeholder based on category).
  - Subtype input with dynamic label:
    - Grinder: `Burr / Mechanism Type`
    - Brewer: `Brewing Method / Category`
    - Scale: `Features / Resolution`
    - Kettle: `Kettle Features / Spout`
  - Dial Setting Format selector for grinders (`Stepped Numbers`, `Clicks`, `Stepless`).
  - Favorite toggle button/switch.
  - Notes multiline text input.
  - In Edit mode: destructive "DELETE EQUIPMENT" button at bottom.

- [ ] **Step 4: Create `apps/mobile/app/equipment/modal.tsx` and register in `apps/mobile/app/_layout.tsx`**

In `apps/mobile/app/equipment/modal.tsx`:
```tsx
import React from 'react';
import { EquipmentModalScreen } from '../../src/features/equipment/screens/EquipmentModalScreen';

export default function EquipmentModalRoute() {
  return <EquipmentModalScreen />;
}
```

In `apps/mobile/app/_layout.tsx`, add:
```tsx
<Stack.Screen
  name="equipment/modal"
  options={{
    presentation: 'modal',
    headerShown: false,
  }}
/>
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run apps/mobile/src/features/equipment/screens/EquipmentModalScreen.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/features/equipment/screens/EquipmentModalScreen.tsx apps/mobile/src/features/equipment/screens/EquipmentModalScreen.test.tsx apps/mobile/app/equipment/modal.tsx apps/mobile/app/_layout.tsx
git commit -m "feat(mobile): create EquipmentModalScreen with KeyboardAwareScrollView and add/edit/delete flows"
```

---

### Task 6: Web Parity Updates (`useEquipment.ts` & `EquipmentView.tsx`)

**Files:**
- Modify: `apps/web/src/features/equipment/useEquipment.ts`
- Modify: `apps/web/src/features/equipment/EquipmentView.tsx`
- Modify: `apps/web/src/lib/sampleData.ts`
- Test: `apps/web/src/features/equipment/useEquipment.test.ts`
- Test: `apps/web/src/features/equipment/EquipmentView.test.tsx`

**Interfaces:**
- Consumes: `DEFAULT_INITIAL_EQUIPMENT` from `@brewlog/core`.
- Produces: Updated `useEquipment` exporting `updateEquipment` and `toggleFavorite`.
- Produces: Updated `EquipmentView` supporting search, category chips, card edit modal, card favorite star toggle, and delete with confirmation.

- [ ] **Step 1: Write the failing tests in `useEquipment.test.ts` and `EquipmentView.test.tsx`**

Test scenarios in `useEquipment.test.ts`:
1. `updateEquipment` modifies item in state and localStorage.
2. `toggleFavorite` flips `isFavorite` on the item.
3. Consumes `DEFAULT_INITIAL_EQUIPMENT` on initial load.

Test scenarios in `EquipmentView.test.tsx`:
1. Renders search input and filters cards across all categories.
2. Renders category chips (`All`, `Grinders`, `Brewers`, `Scales`, `Kettles`) and filters when clicked.
3. Clicking a card's edit button opens modal in Edit mode pre-populated with item data.
4. Clicking Star button calls `onToggleFavorite(item.id)`.
5. Modal supports editing, saving changes, and deleting in edit mode with confirmation.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run apps/web/src/features/equipment/useEquipment.test.ts apps/web/src/features/equipment/EquipmentView.test.tsx`
Expected: FAIL

- [ ] **Step 3: Update `apps/web/src/features/equipment/useEquipment.ts`**

- Import `DEFAULT_INITIAL_EQUIPMENT` from `@brewlog/core`.
- Add `updateEquipment`:
  - Optimistically updates `equipment` state.
  - Saves to `localStorage`.
  - If authenticated with Supabase and not a local prefix ID, calls `supabase.from('equipment').update(mapEquipmentDomainToInsert(updatedItem, user.id)).eq('id', id)`.
- Add `toggleFavorite`:
  - Calls `updateEquipment(id, { isFavorite: !current.isFavorite })`.

- [ ] **Step 4: Update `apps/web/src/features/equipment/EquipmentView.tsx`**

- Add `searchQuery` state and search input bar below header.
- Add `selectedCategory` filter chips (`All`, `Grinders`, `Brewers`, `Scales`, `Kettles`).
- Add `editingEquipment: Equipment | null` state.
- Update modal to support both Add and Edit:
  - Pre-fill values when `editingEquipment` is present.
  - Add "Mark as Favorite" checkbox.
  - In Edit mode: show "Save Changes" and "Delete Equipment" button with `ConfirmationModal`.
- On cards:
  - Add interactive `Star` icon button with amber fill when `isFavorite: true`.
  - Add `Pencil` icon / clickable edit trigger to open edit modal.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run apps/web/src/features/equipment/useEquipment.test.ts apps/web/src/features/equipment/EquipmentView.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/equipment/useEquipment.ts apps/web/src/features/equipment/EquipmentView.tsx apps/web/src/lib/sampleData.ts apps/web/src/features/equipment/useEquipment.test.ts apps/web/src/features/equipment/EquipmentView.test.tsx
git commit -m "feat(web): update equipment flow with search, category chips, edit modal, and favorite starring"
```

---

### Task 7: Full Monorepo Typecheck & Comprehensive Verification Gate

**Files:**
- Entire monorepo (`packages/core`, `apps/mobile`, `apps/web`)

- [ ] **Step 1: Run typechecks across all workspaces**

Run:
```bash
npm run typecheck --workspaces --if-present
```
Verify zero TypeScript compiler errors.

- [ ] **Step 2: Run core test suite**

Run:
```bash
npm test -w @brewlog/core -- run
```
Verify all core tests pass.

- [ ] **Step 3: Run mobile test suite**

Run:
```bash
npm test -w @brewlog/mobile -- run
```
Verify all mobile tests pass.

- [ ] **Step 4: Run web test suite**

Run:
```bash
npm test -w @brewlog/web -- run
```
Verify all web tests pass.

- [ ] **Step 5: Final review and clean git status check**

Run: `git status`
Verify everything is committed and tree is clean.
