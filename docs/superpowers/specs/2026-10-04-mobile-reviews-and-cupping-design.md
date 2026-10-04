# Design Spec: Mobile Reviews Subsystem & Web Cupping Parity

- **Date:** 2026-10-04
- **Status:** Approved Draft
- **Target Files:**
  - `apps/mobile/src/features/reviews/ReviewsContext.tsx`
  - `apps/mobile/src/features/reviews/screens/ReviewsCatalogScreen.tsx`
  - `apps/mobile/src/features/reviews/screens/ReviewModalScreen.tsx`
  - `apps/mobile/src/features/reviews/screens/ReviewDetailScreen.tsx`
  - `apps/mobile/src/features/reviews/components/ReviewCard.tsx`
  - `apps/mobile/src/features/reviews/components/ReviewsSummaryBar.tsx`
  - `apps/mobile/src/features/reviews/components/ScaAttributeScoring.tsx`
  - `apps/mobile/src/features/reviews/components/FlavorTagSelector.tsx`
  - `apps/mobile/src/features/reviews/components/ScaFlavorWheelSvg.tsx`
  - `apps/mobile/app/(tabs)/reviews.tsx`
  - `apps/mobile/app/reviews/modal.tsx`
  - `apps/mobile/app/reviews/[id].tsx`
  - `apps/mobile/app/(tabs)/_layout.tsx`
  - `apps/mobile/app/(tabs)/index.tsx`
  - `apps/mobile/app/_layout.tsx`

---

## 1. Overview & Goals

The mobile application currently has a placeholder screen for the 5th tab (`app/(tabs)/cupping.tsx`), while the web app provides a full SCA 10-attribute cupping scoring sheet and interactive sensory flavor wheel (`CuppingView.tsx`).

This milestone achieves full parity with the web cupping and tasting log capabilities while adapting them to mobile UX patterns established in the Bean Stash and Equipment milestones:

1. **User-Friendly "Reviews" Nomenclature**:
   - Rather than rigid industry "Cupping" jargon (which refers to multi-bowl protocol rarely performed by daily coffee drinkers), user-facing mobile interfaces refer to this experience as **"Reviews"** and **"Tasting Journal"** (`(tabs)/reviews.tsx`), matching the existing tab label.
   - Under the hood, domain models reuse `@brewlog/core`'s `TastingLog`, `CuppingAttributes`, `calculateScaScore`, and Supabase's `tasting_logs` table.
2. **Catalog + Modal Architecture**:
   - Matches the Bean Stash and Equipment pattern: `ReviewsCatalogScreen` on the tab with search, filters, and summary metrics, an `+ NEW REVIEW` header button opening `ReviewModalScreen` as a modal sheet, and `ReviewDetailScreen` for in-depth inspection of a past brew.
3. **Equipment Tracking in Reviews**:
   - Connects to mobile's `EquipmentContext` so users can record the exact **Grinder** (with specific grind setting, e.g. "18 clicks", "5.2", "Medium-Fine") and **Brewer** used. Stores `grinderSnapshot` and `brewerSnapshot` to ensure historical logs survive future equipment deletions.
4. **Responsive Sensory Flavor Selector**:
   - Auto-adapts based on screen width (`width >= 600px`).
   - On standard portrait phones (<600px), defaults to thumb-friendly **Categorized Tag Chips** (with an optional toggle to an interactive SVG wheel featuring tap-to-inspect category callouts).
   - On foldables and tablets (>=600px), unlocks the full-scale interactive 2-ring SVG wheel.
5. **Seamless Timer Completion Handoff**:
   - When a brew completes on the Timer tab, tapping "Log Cupping" navigates to `/reviews/modal` prefilled with the active bean, brew method, dose, water volume, actual brew time, and split timeline notes.

---

## 2. Hardened Safeguards (Lessons Learned from Equipment Milestone)

To avoid regressions caught in previous code reviews, this specification enforces the following concrete implementation rules:

1. **PostgreSQL UUID Syntax Safety (`22P02`)**:
   - Local offline items or starter samples may have string IDs (e.g. `local-review-*`).
   - Remote Supabase calls (`.delete().eq('id', id)` and `.update()`) must **only** execute when `target.userId === user.id` AND the ID is a verified server UUID.
   - Deleting or editing unpersisted local records operates strictly on local state and `AsyncStorage` without sending invalid string IDs to PostgreSQL.
2. **Cold-Start / Deep-Link Hydration Guard**:
   - In `ReviewModalScreen` and `ReviewDetailScreen`, if an `id` param is present and `loading === true`, the screen renders an `ActivityIndicator` with `testID="review-modal-loading"` instead of prematurely rendering "Review not found" or a blank form.
   - Form state is encapsulated in an inner component keyed by `sourceItem?.id || id || 'new'` to ensure clean mounting once hydrated.
3. **Empty Cache Retention**:
   - In `loadCachedReviews`, the cache loader explicitly checks `raw !== null` and `Array.isArray(parsed)`. An empty array `[]` (resulting from a user deleting all reviews) is respected and will **never** re-seed sample reviews.
4. **Immediate Server ID Swap During Sync**:
   - In `refreshReviews`, the moment an offline review is uploaded via Supabase `.insert()` / `.upsert()`, its local temporary ID is immediately swapped with the returned server UUID in `reviewsRef.current` and persisted to `AsyncStorage` before subsequent steps run.
   - Any pending updates or deletes targeting that local ID are updated to use the new server UUID.
5. **Preserving Unsynced Offline Items on Failed Network Insertion**:
   - Remote sync tracks `syncedIds`. Any offline review that fails insertion remains in `remainingUnsynced` and is preserved in local storage and state alongside fetched remote records.
6. **No Redundant iOS Search Clear Button**:
   - In `ReviewsCatalogScreen`, the search `TextInput` omits `clearButtonMode="while-editing"`, using only our custom accessible `X` button with hitSlop.
7. **Keyboard Occlusion Prevention**:
   - `ReviewModalScreen` uses `KeyboardAwareScrollView` with `bottomOffset={32}` so inputs at the bottom (notes, equipment details, sliders) are never blocked by the virtual keyboard.
8. **Touch Target Size Compliance**:
   - All interactive elements (filter chips, steppers, preset pills, star rating buttons, and flavor tag chips) provide a minimum $\ge 44\text{pt}$ touch target or `hitSlop`.
9. **Unsaved Changes Discard Confirmation**:
   - Form tracking checks dirty state against initial values and prompts with `Alert.alert('Discard changes?', 'You have unsaved changes that will be lost.')` upon tapping `X` or dismissing.

---

## 3. Data Layer & State Management (`ReviewsContext`)

### Location: `apps/mobile/src/features/reviews/ReviewsContext.tsx`

### Storage Keys
- `@brewlog/mobile:reviews_cache`: Serialized `TastingLog[]`.
- `@brewlog/mobile:reviews_pending_updates`: Set of review IDs with queued offline modifications.
- `@brewlog/mobile:reviews_pending_deletes`: Set of review IDs with queued offline deletions.

### Pending Brew Session Interface
```typescript
export interface PendingBrewSession {
  bean?: Bean | null;
  recipe?: BrewRecipe | null;
  brewMethod?: BrewMethodType;
  coffeeDoseGrams?: number;
  waterAmountGrams?: number;
  actualTimeSeconds?: number;
  grindSetting?: string;
  waterTempCelsius?: number;
  notes?: string;
  grinderId?: string;
  brewerId?: string;
}
```

### Context Value Interface
```typescript
export type AddTastingLogInput = Omit<TastingLog, 'id' | 'createdAt'> & {
  id?: string;
  createdAt?: string;
};

export type TastingLogUpdater =
  | Partial<TastingLog>
  | ((prev: TastingLog) => Partial<TastingLog>);

export interface ReviewsContextValue {
  reviews: TastingLog[];
  loading: boolean;
  addReview: (review: AddTastingLogInput) => Promise<TastingLog>;
  updateReview: (id: string, updates: TastingLogUpdater) => Promise<TastingLog>;
  deleteReview: (id: string) => Promise<void>;
  refreshReviews: () => Promise<void>;
  pendingBrewSession: PendingBrewSession | null;
  setPendingBrewSession: (session: PendingBrewSession | null) => void;
}
```

### Optimistic Operations & Offline Synchronization
1. `addReview`:
   - Generates client UUID (`crypto.randomUUID()` with fallback).
   - Recalculates `calculatedScaScore` if not present.
   - Prepends to `reviewsRef.current` and state, writes to `AsyncStorage`.
   - If online & authenticated: inserts into Supabase `tasting_logs`, swaps local ID for server record, persists updated cache. If offline: leaves `userId: undefined` for future sync.
2. `updateReview`:
   - Applies updates optimistically to state and `AsyncStorage`.
   - If item is synced (`target.userId === user.id` with valid UUID), queues into `pendingUpdates` and executes Supabase `.update()`.
3. `deleteReview`:
   - Removes optimistically from state and `AsyncStorage`.
   - If item is synced (`target.userId === user.id` with valid UUID), queues into `pendingDeletes` and executes Supabase `.delete()`.
4. `refreshReviews`:
   - Drains `pendingDeletesRef`.
   - Syncs offline items (`!r.userId`), swapping IDs immediately on success and tracking `syncedIds`.
   - Drains `pendingUpdatesRef`.
   - Queries `supabase.from('tasting_logs').select('*').order('brew_date', { ascending: false })`.
   - Reconciles remote rows with pending local edits and unsynced items.

---

## 4. UI Components & Screen Specifications

### 4.1. Catalog Tab (`apps/mobile/src/features/reviews/screens/ReviewsCatalogScreen.tsx`)
- **Route**: `apps/mobile/app/(tabs)/reviews.tsx`
- **Header**:
  - Eyebrow: `TASTING JOURNAL`
  - Title: `Brew Reviews`
  - Subtitle: `Track tasting notes, flavor profiles, and sensory scores.`
  - Action Button: `+ NEW REVIEW` (navigates to `/reviews/modal`).
- **Summary Chassis Bar (`ReviewsSummaryBar.tsx`)**:
  - Displays 3 tiles: Total Reviews, Average Rating/Score, and Top Flavor Descriptor.
- **Search Bar**:
  - Filters across coffee name, roaster, brew method, flavor tags, and notes.
  - Custom clear `X` button with hitSlop (no redundant iOS clear button).
- **Filter Chips**:
  - Method filter: `All`, `V60`, `Espresso`, `AeroPress`, `Chemex`, `French Press`, `Kalita Wave`, `Other`.
  - Star rating filter: `All`, `5 Stars`, `4+ Stars`, `3+ Stars`.
- **Review List**:
  - FlatList of `ReviewCard` items.
  - Empty states for zero reviews and unmatched search queries.

### 4.2. Review Card (`apps/mobile/src/features/reviews/components/ReviewCard.tsx`)
- Displays:
  - Top row: Brew method pill, brew date formatted, star rating.
  - Title: Coffee name (`beanNameSnapshot`), roaster (`by roasterSnapshot`).
  - Equipment row (if recorded): `grinderSnapshot` (with `grindSetting`) and/or `brewerSnapshot`.
  - Specs & Score row: Dose : water, brew time, and calculated SCA score with colored classification pill (`Outstanding`, `Excellent`, `Very Good`, `Commercial`).
  - Flavor tag badges (up to 4, +N overflow badge).
  - Notes quote snippet.
- Accessible tap target $\ge 44\text{pt}$ navigating to `/reviews/[id]`.

### 4.3. Review Modal Screen (`apps/mobile/src/features/reviews/screens/ReviewModalScreen.tsx`)
- **Route**: `apps/mobile/app/reviews/modal.tsx` (presentation: `modal`, `headerShown: false`).
- **Hydration Guard**: Shows `ActivityIndicator` (`testID="review-modal-loading"`) if `id` exists while `loading === true`.
- **Header**:
  - Close button `X` (triggers dirty discard confirmation).
  - Title: `New Review` or `Edit Review`.
  - Save button `✓` or `SAVE`.
- **Pending Brew Banner**:
  - If loaded from a completed timer session, displays `Completed Brew Loaded: [Bean] • [Recipe] ([time]s)` with `CLEAR` button.
- **Form Sections**:
  1. **Coffee Selection**:
     - Picker to select bean from Stash, or option to enter custom coffee (Name & Roaster).
  2. **Equipment & Brew Specs**:
     - Grinder picker (from `useEquipment().grinders` or custom), Grind setting input (e.g. `18 clicks`).
     - Brewer picker (from `useEquipment().brewers` or custom), Brew method selector.
     - Dose (g), Water (g), Time (s), Water Temp (°C).
  3. **Sensory Wheel & Flavor Tags (`FlavorTagSelector.tsx`)**:
     - Responsive: defaults to categorized chips on phones (<600px), offers interactive SVG wheel on foldables/tablets (>=600px) or via toggle.
     - Selected tags bar with one-tap removal.
  4. **SCA Sensory Scoring (`ScaAttributeScoring.tsx`)**:
     - Group 1: Fragrance/Aroma, Flavor, Aftertaste, Acidity, Body, Balance, Overall Impression (0.0–10.0, step 0.1).
     - Group 2: Clean Cup, Sweetness, Uniformity (0–10, step 0.5, baseline 10.0).
     - Quick "Baseline (82.5)" and "Clear (0)" presets.
     - Live score display + specialty classification pill.
  5. **Tasting Notes & Rating**:
     - Impressions textarea.
     - 1–5 star rating selector.
     - "Would brew again" checkbox.
  6. **Destructive Action** (Edit mode only):
     - Delete button with confirmation alert.

### 4.4. Review Detail Screen (`apps/mobile/src/features/reviews/screens/ReviewDetailScreen.tsx`)
- **Route**: `apps/mobile/app/reviews/[id].tsx`
- **Header**: Back button, Title: `Review Details`, Edit button (routes to `/reviews/modal?id=...`).
- **Content**:
  - Hero card: Coffee name, roaster, brew date, method, rating stars.
  - Equipment & Parameters chassis: Grinder & setting, Brewer, Dose, Water, Ratio, Time, Temp.
  - SCA Score Card: Calculated score, classification badge, and breakdown of all 10 attribute scores.
  - Flavor Notes section: Displaying all selected flavor tags with category color hints.
  - Tasting Impressions: Complete cupper notes.
  - Delete action button with confirmation dialog.

---

## 5. Navigation & Layout Wiring

1. **`apps/mobile/app/_layout.tsx`**:
   - Register `<ReviewsProvider>` inside `<EquipmentProvider>`.
   - Register stack routes:
     ```tsx
     <Stack.Screen
       name="reviews/[id]"
       options={{
         headerShown: true,
         title: 'Review Details',
         headerBackTitle: 'Back',
         headerStyle: { backgroundColor: colors.canvas },
         headerTintColor: colors.textPrimary,
         headerTitleStyle: { fontWeight: '700' },
       }}
     />
     <Stack.Screen
       name="reviews/modal"
       options={{
         presentation: 'modal',
         headerShown: false,
       }}
     />
     ```
2. **`apps/mobile/app/(tabs)/_layout.tsx`**:
   - Update the 5th tab screen from `name="cupping"` to `name="reviews"`:
     ```tsx
     <Tabs.Screen
       name="reviews"
       options={{
         title: 'Reviews',
         tabBarIcon: ({ color, size }) => (
           <Award size={size} color={color} />
         ),
       }}
     />
     ```
3. **`apps/mobile/app/(tabs)/index.tsx` (Timer Completion)**:
   - In `handleLogCupping`, navigate to `/reviews/modal` passing:
     ```typescript
     router.push({
       pathname: '/reviews/modal',
       params: {
         fromTimer: 'true',
         beanId: activeBrewBean?.id,
         recipeId: activeRecipe.id,
         brewMethod: activeRecipe.brewMethod,
         dose: String(activeTimerDose),
         water: String(activeRecipe.waterAmountGrams),
         actualTime: String(elapsedSeconds),
         grind: activeRecipe.grindSize,
         temp: String(activeRecipe.waterTempCelsius),
         grinderId: activeRecipe.recommendedGrinderId,
         brewerId: activeRecipe.recommendedBrewerId,
         notes: notes,
       },
     });
     ```

---

## 6. Verification & Test Plan

1. **Unit Tests**:
   - `ReviewsContext.test.tsx`:
     - Hydration from `AsyncStorage`.
     - Respecting empty cache `[]` without re-seeding.
     - Offline add, update, delete with optimistic state updates.
     - Swapping server UUID on remote sync without duplicate inserts.
     - Skipping remote calls for non-UUID / non-synced items (preventing Postgres 22P02).
   - `ReviewsCatalogScreen.test.tsx`:
     - Renders summary metrics correctly.
     - Search filtering across coffee, roaster, tags, and notes.
     - Brew method and rating filter chip filtering.
     - Empty states for zero reviews and empty search results.
   - `ReviewModalScreen.test.tsx`:
     - Cold-start hydration loading guard (`ActivityIndicator`).
     - Pre-filling from timer completion params.
     - Stash bean picker vs custom coffee inputs.
     - Equipment picker (grinder + grind setting, brewer).
     - SCA score calculation and quick presets (Baseline / Clear).
     - Dirty state confirmation on exit.
     - Saving a new review and updating an existing review.
   - `ReviewDetailScreen.test.tsx`:
     - Cold-start hydration loading guard.
     - Renders complete brew specs, equipment snapshots, and SCA score breakdown.
     - Edit and delete actions.
2. **Testing Workflow & Execution**:
   - Focused unit tests can be run during development when verifying complex logic (e.g. `ReviewsContext` offline sync, state reconciliation, scoring calculations).
   - Broad or full repository test suites will **not** be run for small intermediate edits or UI styling tweaks; full suite verification will be reserved for milestone completion before committing and pushing.

---

## 7. Web Parity Enhancements (`apps/web`)

To maintain strict cross-platform parity, any capability added to mobile must also be supported on web:

1. **Equipment Context Wiring (`apps/web/src/routes/CuppingRoute.tsx`)**:
   - Pass `equipment={equipment}` from `useRootOutletContext()` to `CuppingView`.
2. **Equipment Selection in `CuppingView.tsx`**:
   - Add Grinder selection dropdown (from `equipment.filter(e => e.type === 'grinder')` plus "+ Enter Custom Grinder" and "None").
   - Add Grind Setting text input (e.g. `18 clicks`, `5.2`, `Medium-Fine`). Pre-fills from `pendingBrewSession.recipe.grindSize`.
   - Add Brewer selection dropdown (from `equipment.filter(e => e.type === 'brewer')` plus "+ Enter Custom Brewer"). Pre-fills from `pendingBrewSession.recipe.recommendedBrewerId`.
3. **Saving Equipment Snapshots (`handleSaveTastingLog`)**:
   - Save `grinderId`, `brewerId`, `grinderSnapshot`, `brewerSnapshot`, and `grindSetting` in the `newLogPayload`.
4. **History Display Parity**:
   - In "Past Brew Sessions & Cupping Notes" on web, display the grinder snapshot, grind setting, and brewer snapshot alongside the coffee dose, water, and time.
5. **Web Unit Testing**:
   - Add tests in `apps/web/src/features/cupping/CuppingView.test.tsx` verifying grinder/brewer selection, snapshot creation, and pre-filling from completed brew session.
