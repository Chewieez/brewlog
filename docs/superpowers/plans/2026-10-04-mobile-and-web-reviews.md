# Reviews Subsystem & Web Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete Reviews (tasting log & sensory review) subsystem across mobile and web with full cross-platform parity, aligned with the mobile Bean Stash and Equipment catalog + modal patterns, including equipment tracking, a responsive sensory wheel, and retiring all legacy "Cupping" naming.

**Architecture:** An offline-first `ReviewsContext` backed by `AsyncStorage` and Supabase cloud sync (`tasting_logs`), structured into a Catalog Tab (`ReviewsCatalogScreen`), a full CRUD Modal (`ReviewModalScreen`), and an Inspection Detail view (`ReviewDetailScreen`) on mobile, with a parallel `ReviewsView` and `ReviewsRoute` on web.

**Tech Stack:** React 19.2.8, React Native (Expo SDK 57), Expo Router, `react-native-keyboard-controller`, `react-native-svg`, `@brewlog/core`, `@brewlog/supabase`, Vitest, `@testing-library/react-native`.

**Spec:** `docs/superpowers/specs/2026-10-04-mobile-and-web-reviews-design.md`

## Global Constraints

- **Terminology:** User-facing labels use "Reviews" / "Tasting Journal" / `<Plus size={16} ... /> ADD REVIEW` / `Add Review`. Domain types reuse `@brewlog/core`'s `TastingLog` and Supabase's `tasting_logs`.
- **Postgres 22P02 Guard:** Only query Supabase `.eq('id', id)` for updates/deletes if `target.userId === user.id` and the ID is a valid synced server UUID.
- **Cold-Start Hydration Guard:** `ReviewModalScreen` and `ReviewDetailScreen` must render `ActivityIndicator` (`testID="review-modal-loading"`) while `loading === true` if an `id` param is present.
- **Empty Cache Retention:** `raw !== null` and `Array.isArray(parsed)` ensures empty arrays `[]` do not resurrect sample data.
- **Immediate ID Swap:** Swap local temporary ID with server UUID in `reviewsRef.current` immediately upon upload to prevent duplicate sync inserts.
- **Preserve Failed Syncs:** Keep unsynced items in state/cache if Supabase upload fails.
- **Keyboard Handling:** Modals use `KeyboardAwareScrollView` with `bottomOffset={32}`.
- **Touch Targets:** Minimum $\ge 44\text{pt}$ touch targets or `hitSlop` on all interactive controls.
- **Testing Rule:** Focused unit tests may be run during development to verify critical logic; full repository test suite runs only at final milestone verification.

---

### Task 1: `ReviewsContext` & Data Layer

**Files:**
- Create: `apps/mobile/src/features/reviews/ReviewsContext.tsx`
- Create: `apps/mobile/src/features/reviews/ReviewsContext.test.tsx`
- Modify: `apps/mobile/app/_layout.tsx`

**Interfaces:**
- Consumes:
  - `@brewlog/core`: `TastingLog`, `CuppingAttributes`, `calculateScaScore`, `Bean`, `BrewRecipe`, `BrewMethodType`
  - `@brewlog/supabase`: `mapTastingLogRowToDomain`, `mapTastingLogDomainToInsert`, `TastingLogRow`
  - `apps/mobile/src/features/auth/AuthContext`: `useAuth`
- Produces:
  - `ReviewsProvider`: Component wrapping children
  - `useReviews()`: Hook returning `ReviewsContextValue`
  - `useOptionalReviews()`: Hook returning `ReviewsContextValue | null`
  - `PendingBrewSession`: Data contract for timer completion handoff

- [ ] **Step 1: Write the failing unit tests for `ReviewsContext`**

Create `apps/mobile/src/features/reviews/ReviewsContext.test.tsx` testing:
1. Hydrating from AsyncStorage cache (`@brewlog/mobile:reviews_cache`).
2. Respecting empty array `[]` in cache without re-seeding sample data.
3. Adding a review optimistically offline with client UUID.
4. Updating and deleting reviews optimistically.
5. Skipping Supabase `.delete()` and `.update()` when ID is an unpersisted local ID (preventing 22P02).
6. Syncing offline reviews and immediately swapping server UUID.
7. Preserving unsynced items if remote upload fails.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/mobile/src/features/reviews/ReviewsContext.test.tsx`
Expected: FAIL ("Cannot find module ./ReviewsContext")

- [ ] **Step 3: Implement `ReviewsContext.tsx`**

Implement `apps/mobile/src/features/reviews/ReviewsContext.tsx`:
- Storage keys:
  - `REVIEWS_STORAGE_KEY = '@brewlog/mobile:reviews_cache'`
  - `REVIEWS_PENDING_UPDATES_KEY = '@brewlog/mobile:reviews_pending_updates'`
  - `REVIEWS_PENDING_DELETES_KEY = '@brewlog/mobile:reviews_pending_deletes'`
- Helper functions: `loadCachedReviews`, `persistCachedReviews`, `loadPendingUpdates`, `persistPendingUpdates`, `loadPendingDeletes`, `persistPendingDeletes`.
- Hydration check: `raw !== null && Array.isArray(parsed)`.
- Immediate server UUID swap on `supabase.from('tasting_logs').insert()`.
- Queueing logic and Postgres 22P02 check: `if (supabase && user && target?.userId === user.id && isValidUUID(id))`.
- Pending brew session state: `const [pendingBrewSession, setPendingBrewSession] = useState<PendingBrewSession | null>(null)`.

- [ ] **Step 4: Register `ReviewsProvider` in `apps/mobile/app/_layout.tsx`**

Import `ReviewsProvider` and nest it inside `<EquipmentProvider>` in `apps/mobile/app/_layout.tsx`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run apps/mobile/src/features/reviews/ReviewsContext.test.tsx`
Expected: PASS (all tests pass)

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/features/reviews/ReviewsContext.tsx apps/mobile/src/features/reviews/ReviewsContext.test.tsx apps/mobile/app/_layout.tsx
git commit -m "feat(reviews): implement ReviewsContext with offline persistence and Supabase sync"
```

---

### Task 2: Reusable Reviews UI Components

**Files:**
- Create: `apps/mobile/src/features/reviews/components/ReviewsSummaryBar.tsx`
- Create: `apps/mobile/src/features/reviews/components/ScaAttributeScoring.tsx`
- Create: `apps/mobile/src/features/reviews/components/ScaFlavorWheelSvg.tsx`
- Create: `apps/mobile/src/features/reviews/components/FlavorTagSelector.tsx`
- Create: `apps/mobile/src/features/reviews/components/ReviewCard.tsx`
- Create: `apps/mobile/src/features/reviews/components/ReviewCard.test.tsx`
- Create: `apps/mobile/src/features/reviews/components/ScaAttributeScoring.test.tsx`

**Interfaces:**
- Consumes:
  - `@brewlog/core`: `TastingLog`, `CuppingAttributes`, `calculateScaScore`, `SCA_FLAVOR_WHEEL`, `INDUSTRIAL_PRECISION_THEME`
  - `lucide-react-native`: Icons
  - `react-native-svg`: `Svg`, `Path`, `G`, `Circle`, `Text`
- Produces:
  - `ReviewsSummaryBar`: Renders total reviews, avg rating, top flavor note.
  - `ScaAttributeScoring`: Interactive 10-attribute scoring with steppers, Baseline (82.5) / Clear (0) presets, and live score hero.
  - `ScaFlavorWheelSvg`: SVG flavor wheel with touchable categories and tap-to-inspect readout.
  - `FlavorTagSelector`: Responsive tag chips / wheel switcher (`width >= 600px`).
  - `ReviewCard`: Card component for catalog list with $\ge 44\text{pt}$ touch target.

- [ ] **Step 1: Write unit tests for `ReviewCard` and `ScaAttributeScoring`**

Create `apps/mobile/src/features/reviews/components/ReviewCard.test.tsx` and `ScaAttributeScoring.test.tsx`:
- Test that `ReviewCard` renders coffee name, roaster, brew method, star rating, SCA score badge, equipment snapshots, and triggers `onPress`.
- Test that `ScaAttributeScoring` updates attribute values, calculates correct SCA score, and handles "Baseline (82.5)" and "Clear (0)" presets.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run apps/mobile/src/features/reviews/components/ReviewCard.test.tsx apps/mobile/src/features/reviews/components/ScaAttributeScoring.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement `ReviewsSummaryBar.tsx`**

Implement industrial-precision chassis with 3 metric tiles: Total Reviews, Average Rating/SCA Score, Top Flavor Descriptor.

- [ ] **Step 4: Implement `ScaAttributeScoring.tsx`**

Implement the 10 SCA attribute steppers with touch targets $\ge 44\text{pt}$, baseline/clear buttons, and live score hero.

- [ ] **Step 5: Implement `ScaFlavorWheelSvg.tsx` and `FlavorTagSelector.tsx`**

Implement:
- `ScaFlavorWheelSvg`: Uses `react-native-svg` to draw inner categories and outer descriptors with tap handling.
- `FlavorTagSelector`: Segmented toggle between Tags and Wheel. Breakpoint `width >= 600px` for responsive sizing. Active selected tags chip bar with `✕` removal.

- [ ] **Step 6: Implement `ReviewCard.tsx`**

Implement card matching `BeanCard` styling with brew method badge, date, star rating, bean name, roaster, equipment snapshot row, specs, flavor tags, and SCA classification badge.

- [ ] **Step 7: Run tests to verify they pass**

Run: `npx vitest run apps/mobile/src/features/reviews/components/ReviewCard.test.tsx apps/mobile/src/features/reviews/components/ScaAttributeScoring.test.tsx`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add apps/mobile/src/features/reviews/components/
git commit -m "feat(reviews): add ReviewsSummaryBar, ReviewCard, ScaAttributeScoring, and FlavorTagSelector"
```

---

### Task 3: Reviews Catalog Screen & Tab Navigation

**Files:**
- Create: `apps/mobile/src/features/reviews/screens/ReviewsCatalogScreen.tsx`
- Create: `apps/mobile/src/features/reviews/screens/ReviewsCatalogScreen.test.tsx`
- Create: `apps/mobile/app/(tabs)/reviews.tsx`
- Delete: `apps/mobile/app/(tabs)/cupping.tsx`
- Modify: `apps/mobile/app/(tabs)/_layout.tsx`

**Interfaces:**
- Consumes:
  - `ReviewsContext`: `useReviews`
  - `ReviewsSummaryBar`, `ReviewCard`
  - `expo-router`: `useRouter`
- Produces:
  - Main tab screen at `/(tabs)/reviews`

- [ ] **Step 1: Write failing unit test for `ReviewsCatalogScreen`**

Create `apps/mobile/src/features/reviews/screens/ReviewsCatalogScreen.test.tsx`:
- Tests summary metrics calculation.
- Tests search query filtering across coffee name, roaster, notes, and flavor tags.
- Tests brew method filter chips (`All`, `V60`, `Espresso`, etc.).
- Tests rating filter chips.
- Tests empty state for 0 reviews and empty search results.
- Tests tapping `<Plus size={16} ... /> ADD REVIEW` navigates to `/reviews/modal` via `handleAddReview`.
- Tests tapping a card navigates to `/reviews/${id}`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/mobile/src/features/reviews/screens/ReviewsCatalogScreen.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement `ReviewsCatalogScreen.tsx`**

Implement:
- Header: Eyebrow `TASTING JOURNAL`, Title `Brew Reviews`, Subtitle, and `<Plus size={16} color={colors.canvas} />` + `ADD REVIEW` button (handler: `handleAddReview`).
- `ReviewsSummaryBar` at top.
- Search input with custom `X` clear button (no redundant iOS clear button).
- Method filter scrollable chips and rating filter chips.
- FlatList of `ReviewCard`s.
- Empty states with CTA button `<Plus size={16} color={colors.canvas} />` + `ADD YOUR FIRST REVIEW` (handler: `handleAddReview`).

- [ ] **Step 4: Update Tab Navigation and Delete Legacy Placeholder**

- In `apps/mobile/app/(tabs)/_layout.tsx`: update 5th tab screen to `name="reviews"`.
- Create `apps/mobile/app/(tabs)/reviews.tsx` rendering `<ReviewsCatalogScreen />`.
- Delete `apps/mobile/app/(tabs)/cupping.tsx` via `git rm`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run apps/mobile/src/features/reviews/screens/ReviewsCatalogScreen.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/features/reviews/screens/ReviewsCatalogScreen.tsx apps/mobile/src/features/reviews/screens/ReviewsCatalogScreen.test.tsx apps/mobile/app/\(tabs\)/_layout.tsx apps/mobile/app/\(tabs\)/reviews.tsx
git rm apps/mobile/app/\(tabs\)/cupping.tsx
git commit -m "feat(reviews): implement ReviewsCatalogScreen and wire (tabs)/reviews route"
```

---

### Task 4: Review Modal Screen (Add/Edit Flow)

**Files:**
- Create: `apps/mobile/src/features/reviews/screens/ReviewModalScreen.tsx`
- Create: `apps/mobile/src/features/reviews/screens/ReviewModalScreen.test.tsx`
- Create: `apps/mobile/app/reviews/modal.tsx`
- Modify: `apps/mobile/app/_layout.tsx`

**Interfaces:**
- Consumes:
  - `useReviews()`: `addReview`, `updateReview`, `deleteReview`, `reviews`, `loading`, `pendingBrewSession`, `setPendingBrewSession`
  - `useStash()`: `beans`
  - `useEquipment()`: `grinders`, `brewers`
  - `FlavorTagSelector`, `ScaAttributeScoring`
- Produces:
  - Modal screen at `/reviews/modal`

- [ ] **Step 1: Write failing unit test for `ReviewModalScreen`**

Create `apps/mobile/src/features/reviews/screens/ReviewModalScreen.test.tsx`:
- Tests cold-start hydration loading guard (`ActivityIndicator` with `testID="review-modal-loading"` when `id` is present and `loading === true`).
- Tests pre-filling from route params or `pendingBrewSession`.
- Tests selecting bean from Stash vs entering custom coffee.
- Tests selecting grinder (and entering grind setting) and brewer.
- Tests SCA attribute score calculation and presets.
- Tests dirty state discard confirmation alert on cancel.
- Tests saving new review calls `addReview`.
- Tests saving edit calls `updateReview`.
- Tests deleting review in edit mode calls `deleteReview`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/mobile/src/features/reviews/screens/ReviewModalScreen.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement `ReviewModalScreen.tsx`**

Implement:
- Outer wrapper checking `id && loading` to render `<ActivityIndicator testID="review-modal-loading" />`.
- Inner `ReviewModalForm` keyed by `sourceItem?.id || id || 'new'`.
- `KeyboardAwareScrollView` with `bottomOffset={32}`.
- Top header with `X` (calls `handleClose`), title ("Add Review" / "Edit Review"), and `SAVE REVIEW` / `✓` button (calls `handleSave`).
- Pending brew banner if coming from timer session with `CLEAR` action.
- Coffee Section: Stash picker or custom Name + Roaster inputs.
- Equipment Section: Grinder picker, Grind setting input, Brewer picker, Brew method, Dose, Water, Time, Temp.
- Flavor Tag Selector (Tags/Wheel).
- SCA Sensory Scoring (10 attributes with live score hero).
- Tasting notes textarea, 1–5 star rating, "Would brew again" checkbox.
- Delete button in edit mode with confirmation alert via `handleDelete`.

- [ ] **Step 4: Register route in `apps/mobile/app/_layout.tsx` and create `app/reviews/modal.tsx`**

Create `apps/mobile/app/reviews/modal.tsx` and add `<Stack.Screen name="reviews/modal" options={{ presentation: 'modal', headerShown: false }} />` in `RootLayout`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run apps/mobile/src/features/reviews/screens/ReviewModalScreen.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/features/reviews/screens/ReviewModalScreen.tsx apps/mobile/src/features/reviews/screens/ReviewModalScreen.test.tsx apps/mobile/app/reviews/modal.tsx apps/mobile/app/_layout.tsx
git commit -m "feat(reviews): implement ReviewModalScreen with equipment tracking and dirty guard"
```

---

### Task 5: Review Detail Screen & Timer Completion Handoff

**Files:**
- Create: `apps/mobile/src/features/reviews/screens/ReviewDetailScreen.tsx`
- Create: `apps/mobile/src/features/reviews/screens/ReviewDetailScreen.test.tsx`
- Create: `apps/mobile/app/reviews/[id].tsx`
- Modify: `apps/mobile/app/_layout.tsx`
- Modify: `apps/mobile/app/(tabs)/index.tsx`
- Modify: `apps/mobile/__tests__/tabs/freeBrewIntegration.test.tsx`

**Interfaces:**
- Consumes:
  - `useReviews()`: `reviews`, `deleteReview`, `loading`
  - `useRouter`, `useLocalSearchParams`
- Produces:
  - Review detail inspection screen at `/reviews/[id]`
  - Smooth timer handoff prefilling `/reviews/modal`

- [ ] **Step 1: Write failing unit tests for `ReviewDetailScreen`**

Create `apps/mobile/src/features/reviews/screens/ReviewDetailScreen.test.tsx`:
- Tests cold-start hydration loading guard.
- Tests rendering complete review data (coffee, roaster, brew date, method, rating, grinder snapshot, brewer snapshot, dose : water, time, temp).
- Tests rendering all 10 SCA attribute scores and classification badge.
- Tests rendering flavor tags and tasting notes.
- Tests tapping "Edit" navigates to `/reviews/modal?id=${id}`.
- Tests tapping "Delete" shows confirmation alert and calls `deleteReview`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/mobile/src/features/reviews/screens/ReviewDetailScreen.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement `ReviewDetailScreen.tsx`**

Implement:
- Hydration guard for cold-start / deep-links.
- Hero card: Coffee name, roaster, brew date, method badge, star rating.
- Equipment & Brew Specs chassis: Grinder & setting, Brewer, Dose, Water, Ratio, Time, Temp.
- SCA Sensory Breakdown: Calculated score, classification badge, and full 10-attribute score table/bars.
- Flavor Notes card: Color-coded descriptor chips.
- Notes card: Cupper impressions.
- Actions: Edit button (navigates to `/reviews/modal?id=${id}`) and Delete button with confirmation alert via `handleDelete`.

- [ ] **Step 4: Register route in `apps/mobile/app/_layout.tsx` and create `app/reviews/[id].tsx`**

Create `apps/mobile/app/reviews/[id].tsx` and register `<Stack.Screen name="reviews/[id]" options={{ headerShown: true, title: 'Review Details', headerStyle: { backgroundColor: colors.canvas }, headerTintColor: colors.textPrimary }} />` in `RootLayout`.

- [ ] **Step 5: Wire Timer completion in `apps/mobile/app/(tabs)/index.tsx`**

In `apps/mobile/app/(tabs)/index.tsx`:
- Rename `handleLogCupping` to `handleAddReview`.
- Update button text to `<Plus size={16} color={colors.canvas} />` + `ADD REVIEW` (accessibilityLabel="Add Review").
- Navigate to `/reviews/modal` passing:
  - `fromTimer: 'true'`
  - `beanId: activeBrewBean?.id`
  - `recipeId: activeRecipe.id`
  - `brewMethod: activeRecipe.brewMethod`
  - `dose: String(activeTimerDose)`
  - `water: String(activeRecipe.waterAmountGrams)`
  - `actualTime: String(elapsedSeconds)`
  - `grind: activeRecipe.grindSize`
  - `temp: String(activeRecipe.waterTempCelsius)`
  - `grinderId: activeRecipe.recommendedGrinderId`
  - `brewerId: activeRecipe.recommendedBrewerId`
  - `notes: formattedSplitsNotes || undefined`

Update `freeBrewIntegration.test.tsx` to expect `ADD REVIEW` button and navigation to `/reviews/modal`.

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run apps/mobile/src/features/reviews/screens/ReviewDetailScreen.test.tsx apps/mobile/__tests__/tabs/freeBrewIntegration.test.tsx`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/src/features/reviews/screens/ReviewDetailScreen.tsx apps/mobile/src/features/reviews/screens/ReviewDetailScreen.test.tsx apps/mobile/app/reviews/[id].tsx apps/mobile/app/_layout.tsx apps/mobile/app/\(tabs\)/index.tsx apps/mobile/__tests__/tabs/freeBrewIntegration.test.tsx
git commit -m "feat(reviews): implement ReviewDetailScreen and wire timer completion handoff"
```

---

### Task 6: Web Reviews Subsystem Alignment & Parity

**Files:**
- Rename/Move: `apps/web/src/features/cupping` to `apps/web/src/features/reviews`
  - `CuppingView.tsx` -> `ReviewsView.tsx`
  - `CuppingView.test.tsx` -> `ReviewsView.test.tsx`
  - `useTastingLogs.ts` -> `useReviews.ts` (exporting both `useReviews` and `useTastingLogs` alias for backward-compatibility)
- Rename: `apps/web/src/routes/CuppingRoute.tsx` -> `apps/web/src/routes/ReviewsRoute.tsx`
- Modify: `apps/web/src/layouts/RootLayout.tsx`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/components/shared/Header.tsx`
- Modify: `apps/web/src/routes/TimerRoute.tsx`
- Modify: `apps/web/src/features/timer/TimerView.tsx`
- Modify: `apps/web/src/features/timer/TimerView.test.tsx`
- Modify: `apps/web/src/components/shared/Header.test.tsx`
- Modify: `apps/web/src/App.test.tsx`

**Interfaces:**
- Consumes:
  - `RootOutletContext`: `equipment`, `useRootOutletContext`
  - `@brewlog/core`: `Equipment`
- Produces:
  - Web route at `/reviews` with backward-compatible redirect from `/cupping`
  - `ReviewsView` component replacing `CuppingView`
  - `useReviews` hook replacing `useTastingLogs`
  - Web equipment selection (grinder dropdown + grind setting input, brewer dropdown)
  - Snapshots saved to `tasting_logs` (`grinderSnapshot`, `brewerSnapshot`, `grindSetting`)
  - Equipment snapshots displayed in past reviews history on web
  - Timer view finish button renamed to `ADD REVIEW` (handler: `handleAddReview`)

- [ ] **Step 1: Write failing unit tests for web equipment tracking and review route in `ReviewsView.test.tsx`, `Header.test.tsx`, `TimerView.test.tsx`**

Update/add tests:
- Tests that the Reviews tab link navigates to `/reviews`.
- Tests that TimerView renders "ADD REVIEW" button and navigates to `/reviews` via `handleAddReview`.
- Tests that grinder selection and grind setting input render when `equipment` is provided.
- Tests that brewer selection renders when `equipment` is provided.
- Tests that submitting the review includes `grinderId`, `brewerId`, `grinderSnapshot`, `brewerSnapshot`, and `grindSetting`.
- Tests that past review history renders the grinder and brewer snapshots.
- Tests that prefilling from `pendingBrewSession` pre-selects the recipe's recommended grinder and brewer.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/web/src/features/reviews/ReviewsView.test.tsx apps/web/src/components/shared/Header.test.tsx apps/web/src/features/timer/TimerView.test.tsx`
Expected: FAIL

- [ ] **Step 3: Move/Rename `apps/web/src/features/cupping` to `apps/web/src/features/reviews`**

- Rename directory `apps/web/src/features/cupping` to `apps/web/src/features/reviews`.
- Rename `CuppingView.tsx` to `ReviewsView.tsx` (exporting `ReviewsView`).
- Rename `CuppingView.test.tsx` to `ReviewsView.test.tsx`.
- Rename `useTastingLogs.ts` to `useReviews.ts` (exporting `useReviews` and `useTastingLogs`).
- Rename `apps/web/src/routes/CuppingRoute.tsx` to `apps/web/src/routes/ReviewsRoute.tsx` (exporting `ReviewsRoute`).
- In `apps/web/src/routes/ReviewsRoute.tsx`: pass `equipment` from `useRootOutletContext()` to `<ReviewsView />`.

- [ ] **Step 4: Update `ReviewsView.tsx` with equipment tracking and snapshots**

In `apps/web/src/features/reviews/ReviewsView.tsx`:
- Add `equipment?: Equipment[]` to props.
- In Coffee & Brew Parameters card:
  - Add Grinder dropdown (filtered `type === 'grinder'` + custom/none options).
  - Add Grind Setting text input.
  - Add Brewer dropdown (filtered `type === 'brewer'` + custom/default options).
  - Pre-fill grinder, grind setting, and brewer from `pendingBrewSession?.recipe` when loaded.
- In `handleSave`:
  - Calculate `grinderSnapshot` and `brewerSnapshot` and include `grinderId`, `brewerId`, and `grindSetting` in review payload. Button text is `SAVE REVIEW`.
- In Past Reviews History:
  - Render equipment snapshots (`log.grinderSnapshot` @ `log.grindSetting` • `log.brewerSnapshot`) alongside brew parameters.
  - Section title: "Past Brew Reviews".

- [ ] **Step 5: Update web routes and timer completion**

- In `apps/web/src/App.tsx`: import `ReviewsRoute`, define `<Route path="reviews" element={<ReviewsRoute />} />` and `<Route path="cupping" element={<Navigate to="/reviews" replace />} />`.
- In `apps/web/src/components/shared/Header.tsx`: update reviews tab path to `'/reviews'`.
- In `apps/web/src/routes/TimerRoute.tsx`: update `handleLogCompletedBrew` to `navigate('/reviews')`.
- In `apps/web/src/features/timer/TimerView.tsx`:
  - Rename `handleLogFreeBrewCupping` to `handleAddReview`.
  - Update banner text: "BREW COMPLETE! ADD REVIEW".
  - Update button text: "ADD REVIEW" (aria-label="Add Review").
- In `apps/web/src/layouts/RootLayout.tsx`: update imports from `features/reviews`.

- [ ] **Step 6: Run web tests to verify they pass**

Run: `npx vitest run apps/web/src/features/reviews/ReviewsView.test.tsx apps/web/src/components/shared/Header.test.tsx apps/web/src/features/timer/TimerView.test.tsx apps/web/src/App.test.tsx`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/features/reviews/ apps/web/src/features/cupping/ apps/web/src/routes/ReviewsRoute.tsx apps/web/src/routes/CuppingRoute.tsx apps/web/src/App.tsx apps/web/src/components/shared/Header.tsx apps/web/src/routes/TimerRoute.tsx apps/web/src/features/timer/TimerView.tsx apps/web/src/features/timer/TimerView.test.tsx apps/web/src/components/shared/Header.test.tsx apps/web/src/layouts/RootLayout.tsx apps/web/src/App.test.tsx
git commit -m "feat(web): retire cupping naming across views and routes, add equipment tracking"
```

---

### Task 7: Final Verification & Milestone Quality Gate

**Files:**
- All touched files across `apps/mobile` and `apps/web`

- [ ] **Step 1: Run TypeScript typecheck across all workspaces**

Run: `npm run typecheck`
Expected: 0 type errors across all packages.

- [ ] **Step 2: Run full repository test suite**

Run: `npm test`
Expected: All tests pass across `@brewlog/core`, `@brewlog/supabase`, `@brewlog/mobile`, and `@brewlog/web`.

- [ ] **Step 3: Document milestone devlog**

Create `docs/devlogs/2026-10-04-mobile-and-web-reviews-parity.md` summarizing the completed work, verified test results, and cross-platform parity.

- [ ] **Step 4: Final commit**

```bash
git add docs/devlogs/2026-10-04-mobile-and-web-reviews-parity.md
git commit -m "docs: document mobile and web reviews subsystem parity milestone"
```
