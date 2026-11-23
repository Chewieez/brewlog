# Issue #88: Align Review Detail, Card, and Catalog Layout Order Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the Review Detail, Review Feed Card, and Reviews Catalog hierarchy and filtering behavior across `apps/web` and `apps/mobile` using shared domain helpers in `@brewlog/core`.

**Architecture:** Extract pure SCA tier classification, search matching, and dynamic method/rating filter helpers into `packages/core/src/reviewsUtils.ts` so both platforms share one source of truth. Refactor Web (`ReviewDetailPane.tsx`, extracted `ReviewCard.tsx`, `ReviewsView.tsx`) and Mobile (`ReviewDetailScreen.tsx`, `ReviewCard.tsx`, `ReviewsCatalogScreen.tsx`, `ScaAttributeScoring.tsx`, `ScaFlavorWheelSvg.tsx`) to follow the unified Web-led hierarchy with platform-appropriate action placement.

**Tech Stack:** TypeScript, React 19, React Native / Expo, Tailwind CSS v4, `@brewlog/core`, `@brewlog/ui` (`FilterPills`, `SegmentedControl`, `Button`), Vitest + Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-21-issue-88-align-review-detail-card-catalog-design.md`

## Global Constraints
- Preserve existing snapshot resolution priority: `beanNameSnapshot` / `roasterSnapshot` take precedence over linked stash beans (`ReviewDetailPane.test.tsx`).
- Web button height gate (`apps/web/e2e/button-sizing-tokens.spec.ts`): all visible `<button>` elements on `/reviews` must measure `32px`, `40px`, or `48px` tall (`h-8`, `h-10`, `h-12`).
- Web corner radius gate (`apps/web/e2e/corner-radius-hierarchy.spec.ts`): filter chips, search inputs/buttons, and flavor tag chips use `rounded-lg` (`8px`); segmented thumbs use `rounded-md` (`6px`); cards use `rounded-xl` (`12px`).
- Web E2E selector & spacing parity (`apps/web/e2e/context-features.spec.ts`): preserve `data-testid="reviews-method-filters"`, exact `"All"` pill label, `data-testid="master-feed"`, `data-testid="detail-pane"`, `data-testid="hero-score-badge"`, `data-testid="method-badge"`, `data-testid="brew-time-telemetry"`, and `>= 12px` vertical spacing between the last filter pill and the first feed card.
- Mobile touch targets: interactive `Pressable` controls must have `minHeight: 44` (directly or via `hitSlop`).
- Zero emoji in code, copy, comments, or commit messages.
- Do not change Review create/edit form behavior, except ensuring `ScaAttributeScoring` keeps its live summary hero when `readOnly` is `false`.

## Review Focus
1. **Zero-score / unscored SCA handling:** A log with `calculatedScaScore: 0` must resolve to `{ key: 'commercial', label: 'Commercial' }` via `getScaTierInfo(0)` and render `0.0` + `Commercial` cleanly on both Web and Mobile `ReviewCard` and Detail Hero without hiding header metadata. (Pinned in Task 1, Task 2, Task 3)
2. **Read-only Wheel safety on Mobile `ReviewDetailScreen`:** Tapping a slice on `ScaFlavorWheelSvg` in `readOnly` mode must inspect the descriptor/category in the center overlay without rendering `ADD` / `REMOVE` buttons or invoking `onToggleTag`. (Pinned in Task 4, Task 5)
3. **Mobile `Brew Again` active-brew guard and fallback matching:** Pressing `BREW AGAIN` when `isBrewActive` is `true` must display the `Switch Recipe?` alert before resetting and navigating; pressing `BREW AGAIN` when `beanId`/`recipeId` are absent or orphaned must still match by `beanNameSnapshot`/`brewMethod` or navigate safely without throwing. (Pinned in Task 5)
4. **Synchronous filter fallback & bar hiding when logs mutate:** Selecting a method (e.g., `Flair`) or rating (`5 Stars`) and removing the last matching review must immediately display remaining reviews on the same render pass (`effective* === 'all'`), sync state via `useEffect`, and hide empty filter bars (`options.length <= 1`). (Pinned in Task 6, Task 7)
5. **Web card extraction & clear-filters recovery:** Extracting `ReviewCard.tsx` and adding `reviews-rating-filters` + search clear button on Web must preserve `Space`-key selection (`preventDefault()`), keep button heights in `[32, 40, 48]`, and recover via `CLEAR FILTERS` when search/filters match zero logs. (Pinned in Task 2, Task 6, Task 8)

---

### Task 1: Shared Review Domain & Filter Helpers in `@brewlog/core`

**Files:**
- Create: `packages/core/src/reviewsUtils.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/src/reviewsUtils.test.ts`

**Interfaces:**
- Consumes: `TastingLog`, `BrewMethodType` from `./types`
- Produces:
  - `export type ScaTierKey = 'outstanding' | 'excellent' | 'very-good' | 'commercial'`
  - `export interface ScaTierInfo { key: ScaTierKey; label: string }`
  - `export function getScaTierInfo(score: number): ScaTierInfo`
  - `export type ReviewMethodFilter = string`
  - `export interface ReviewMethodFilterOption { value: ReviewMethodFilter; label: string }`
  - `export function formatReviewMethodLabel(method: string): string`
  - `export function getAvailableReviewMethodOptions(logs: TastingLog[]): ReviewMethodFilterOption[]`
  - `export function matchesReviewMethodFilter(log: TastingLog, filter: ReviewMethodFilter): boolean`
  - `export type ReviewRatingFilter = 'all' | '5' | '4+'`
  - `export interface ReviewRatingFilterOption { value: ReviewRatingFilter; label: string }`
  - `export function getAvailableRatingFilterOptions(logs: TastingLog[]): ReviewRatingFilterOption[]`
  - `export function matchesReviewRatingFilter(log: TastingLog, filter: ReviewRatingFilter): boolean`
  - `export function matchesReviewSearch(log: TastingLog, query: string): boolean`

- [ ] **Step 1: Write failing tests in `packages/core/src/reviewsUtils.test.ts`**

Cover:
1. `getScaTierInfo` boundary values: `90.0` -> `outstanding`/`Outstanding`, `85.0` -> `excellent`/`Excellent`, `80.0` -> `very-good`/`Very Good`, `79.9` and `0` -> `commercial`/`Commercial`.
2. `getAvailableReviewMethodOptions`: returns `[{ value: 'all', label: 'All' }]` for `[]`; returns curated labels (`V60`, `AeroPress`, `Flair`, `Custom`, `Cold Brew`) in canonical order for present methods only, plus title-cased fallback for unlisted slugs (e.g., `origami-dripper` -> `Origami Dripper`).
3. `matchesReviewMethodFilter`: `'all'` matches everything; `'v60'` matches `'v60'` case-insensitively.
4. `getAvailableRatingFilterOptions` & `matchesReviewRatingFilter`: returns only `All Ratings` when all logs have `rating < 4`; adds `4+ Stars` when `rating >= 4`; adds `5 Stars` + `4+ Stars` when `rating >= 5`; matches `5` and `4+` accurately.
5. `matchesReviewSearch`: empty/whitespace matches all; matches `beanNameSnapshot`, `roasterSnapshot`, `notes`, and `flavorTags` case-insensitively; returns `false` when no field matches.

- [ ] **Step 2: Run targeted test to verify failure**

Run: `npm --workspace @brewlog/core test -- src/reviewsUtils.test.ts`
Expected: FAIL because `src/reviewsUtils.ts` does not exist.

- [ ] **Step 3: Implement `packages/core/src/reviewsUtils.ts` and export from `packages/core/src/index.ts`**

Implement the functions above cleanly using a curated label table (`KNOWN_REVIEW_METHODS` covering `v60`, `espresso`, `aeropress`, `french-press`, `chemex`, `kalita-wave`, `pour-over`, `cold-brew`, `flair`, `origami`, `clever-dripper`, `moka-pot`, `custom`) and hyphen-split title-casing fallback. Re-export `* from "./reviewsUtils"` in `packages/core/src/index.ts`.

- [ ] **Step 4: Run targeted test and typecheck**

Run: `npm --workspace @brewlog/core test -- src/reviewsUtils.test.ts && npm --workspace @brewlog/core run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/reviewsUtils.ts packages/core/src/reviewsUtils.test.ts packages/core/src/index.ts
git commit -m "feat(core): add shared review SCA tier, search, and filter helpers"
```

---

### Task 2: Web `ReviewCard` Component Extraction & Notes Snippet Parity

**Files:**
- Create: `apps/web/src/features/reviews/ReviewCard.tsx`
- Create: `apps/web/src/features/reviews/ReviewCard.test.tsx`
- Modify: `apps/web/src/features/reviews/ReviewDetailPane.tsx` (update `getScaTier` to use `getScaTierInfo` from `@brewlog/core` and export `getScaTier` for reuse by `ReviewCard.tsx`)

**Interfaces:**
- Consumes: `TastingLog`, `DateFormatPreference`, `formatDisplayDate`, `getScaTierInfo` from `@brewlog/core`; `getScaTier` from `./ReviewDetailPane`
- Produces: `export interface ReviewCardProps { log: TastingLog; isSelected: boolean; dateFormat: DateFormatPreference; onSelect: (log: TastingLog) => void }` and `export const ReviewCard: React.FC<ReviewCardProps>`

- [ ] **Step 1: Write failing tests in `apps/web/src/features/reviews/ReviewCard.test.tsx`**

Test:
1. Renders in canonical 5-part DOM order: `[1] Header` (rating `★` + SCA score + tier badge, including `0.0` + `Commercial` when unscored), `[2] Identity` (beanName + roaster), `[3] Flavor Tags` (max 3 chips + `+N` overflow), `[4] Notes Snippet` (renders italic 2-line clamped preview when `notes` is non-empty, omits when empty), `[5] Telemetry Footer` (`brewMethod`, `dose:water`, `time`, `formatDisplayDate`).
2. Clicking or pressing `Enter` or `Space` calls `onSelect(log)`, and `Space` calls `preventDefault()`.
3. Selected state applies `border-accent bg-panel-recessed` styling.

- [ ] **Step 2: Run targeted test to verify failure**

Run: `npm --workspace @brewlog/web test -- src/features/reviews/ReviewCard.test.tsx`
Expected: FAIL because `ReviewCard.tsx` does not exist.

- [ ] **Step 3: Update `getScaTier` in `ReviewDetailPane.tsx` and implement `apps/web/src/features/reviews/ReviewCard.tsx`**

- In `ReviewDetailPane.tsx`: update `getScaTier(score: number)` to map `getScaTierInfo(score).key` to the existing Tailwind badge classes and return `{ label: info.label, key: info.key, classes }`.
- In `ReviewCard.tsx`: render the `<div role="button" tabIndex={0}>` card with `rounded-xl`, the 5 sections in order (`Header -> Identity -> Tags (slice 0..3 + +N) -> Notes (line-clamp-2 italic) -> Telemetry Footer`). Format time as `Xm XXs` / `Xs` (matching Web `ReviewsView.tsx`) with `tabular-nums` (preserving `ReviewsView.test.tsx` typography checks).

- [ ] **Step 4: Run targeted test to verify pass**

Run: `npm --workspace @brewlog/web test -- src/features/reviews/ReviewCard.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/reviews/ReviewCard.tsx apps/web/src/features/reviews/ReviewCard.test.tsx apps/web/src/features/reviews/ReviewDetailPane.tsx
git commit -m "feat(web): extract ReviewCard with aligned layout and notes snippet"
```

---

### Task 3: Mobile `ReviewCard` Alignment

**Files:**
- Modify: `apps/mobile/src/features/reviews/components/ReviewCard.tsx`
- Modify: `apps/mobile/src/features/reviews/components/ReviewCard.test.tsx`

**Interfaces:**
- Consumes: `TastingLog`, `formatDisplayDate`, `getScaTierInfo`, `ScaTierKey` from `@brewlog/core`
- Produces: `ReviewCard` (`ReviewCardProps` unchanged: `{ review: TastingLog; onPress: (review: TastingLog) => void }`) matching Web's 5-part structure

- [ ] **Step 1: Update `ReviewCard.test.tsx` to assert the aligned 5-part structure**

Update assertions in `apps/mobile/src/features/reviews/components/ReviewCard.test.tsx`:
1. Renders header (`rating` + `90.0` + `Outstanding` tier badge; and `0.0` + `Commercial` for an unscored review), coffee name + roaster, up to 3 flavor tags (adding a `+1` overflow check when 4 tags are provided), 2-line notes snippet, and telemetry footer (`V60`, `20g:300g`, `3m 30s` or `3:30`, `formatDisplayDate`).
2. Asserts Equipment Snapshot (`Fellow Ode Gen 2`, `18 clicks`, `Hario V60 02`) is **not** rendered on the feed card (`queryByText`).
3. Verify DOM order of Header (`testID="review-card-header"`), Identity (`testID="review-card-identity"`), Flavor Tags, Notes (`testID="review-card-notes"`), Telemetry Footer (`testID="review-card-footer"`) via `compareDocumentPosition`.

- [ ] **Step 2: Run targeted test to verify failure**

Run: `npm --workspace @brewlog/mobile test -- src/features/reviews/components/ReviewCard.test.tsx`
Expected: FAIL because `ReviewCard.tsx` still renders Equipment Snapshot, 4 tags, and lacks the tier badge and aligned order.

- [ ] **Step 3: Refactor `apps/mobile/src/features/reviews/components/ReviewCard.tsx`**

Reorder sections to match Web:
1. Header row (`testID="review-card-header"`): left `Star` icon + `{review.rating || '—'}`; right `{scaScore.toFixed(1)}` + tier pill (`getScaTierInfo(scaScore).label`, styled by `tier.key` using theme colors).
2. Identity (`testID="review-card-identity"`): Coffee name + Roaster.
3. Flavor Tags: `review.flavorTags.slice(0, 3)` + `+{review.flavorTags.length - 3}`.
4. Notes Snippet (`testID="review-card-notes"`): 2-line italic preview (`numberOfLines={2}`) when `review.notes` is present.
5. Telemetry Footer (`testID="review-card-footer"`): left `[METHOD]` badge • `{coffeeDoseGrams}g:{waterAmountGrams}g` • `{formattedTime}`; right `formattedDate`.

- [ ] **Step 4: Run targeted test to verify pass**

Run: `npm --workspace @brewlog/mobile test -- src/features/reviews/components/ReviewCard.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/reviews/components/ReviewCard.tsx apps/mobile/src/features/reviews/components/ReviewCard.test.tsx
git commit -m "feat(mobile): align ReviewCard layout and SCA tier badge with web"
```

---

### Task 4: Mobile `ScaFlavorWheelSvg` (`readOnly`), `ScaAttributeScoring` (`hideSummaryHero`), & `useOptionalRecipes`

**Files:**
- Modify: `apps/mobile/src/features/reviews/components/ScaFlavorWheelSvg.tsx`
- Create: `apps/mobile/src/features/reviews/components/ScaFlavorWheelSvg.test.tsx`
- Modify: `apps/mobile/src/features/reviews/components/ScaAttributeScoring.tsx`
- Modify: `apps/mobile/src/features/reviews/components/ScaAttributeScoring.test.tsx`
- Modify: `apps/mobile/src/features/recipes/RecipeContext.tsx`

**Interfaces:**
- Produces:
  - `ScaFlavorWheelSvgProps`: adds `readOnly?: boolean` (default `false`)
  - `ScaAttributeScoringProps`: adds `hideSummaryHero?: boolean` (default `false`), and aligns tier label `< 80` to `'Commercial'` via `getScaTierInfo`
  - `export const useOptionalRecipes = (): RecipeContextValue | null` in `apps/mobile/src/features/recipes/RecipeContext.tsx`

- [ ] **Step 1: Write failing tests in `ScaFlavorWheelSvg.test.tsx` and `ScaAttributeScoring.test.tsx`**

- In `ScaFlavorWheelSvg.test.tsx`:
  1. When `readOnly={true}` and a descriptor slice is tapped, the center overlay displays the slice's category and descriptor name, does **not** render `ADD` or `REMOVE` buttons, and never calls `onToggleTag`.
  2. When `readOnly={false}` (default), tapping a slice shows `ADD` / `REMOVE` and calls `onToggleTag` when pressed.
- In `ScaAttributeScoring.test.tsx`:
  1. When `hideSummaryHero={true}`, `SCA SENSORY TOTAL` and the hero total score are not rendered, while all 10 attributes render.
  2. When score `< 80`, displays `Commercial` (aligned with `@brewlog/core` `getScaTierInfo`).

- [ ] **Step 2: Run targeted tests to verify failure**

Run: `npm --workspace @brewlog/mobile test -- src/features/reviews/components/ScaFlavorWheelSvg.test.tsx src/features/reviews/components/ScaAttributeScoring.test.tsx`
Expected: FAIL on missing `readOnly`, `hideSummaryHero`, and `Commercial` assertions.

- [ ] **Step 3: Implement updates in `ScaFlavorWheelSvg.tsx`, `ScaAttributeScoring.tsx`, and `RecipeContext.tsx`**

- `ScaFlavorWheelSvg.tsx`: accept `readOnly = false`, hide the center `ADD`/`REMOVE` `Pressable` when `readOnly` is `true`, and guard `onToggleTag` when `readOnly`.
- `ScaAttributeScoring.tsx`: accept `hideSummaryHero = false`, wrap `heroChassis` in `{!hideSummaryHero && (...)}`, and replace local `getClassification` strings with `getScaTierInfo(totalScore)` mapped to theme colors (`${tier.label} (SCA)` or `tier.label`).
- `RecipeContext.tsx`: add `export const useOptionalRecipes = (): RecipeContextValue | null => useContext(RecipeContext);`.

- [ ] **Step 4: Run targeted tests to verify pass**

Run: `npm --workspace @brewlog/mobile test -- src/features/reviews/components/ScaFlavorWheelSvg.test.tsx src/features/reviews/components/ScaAttributeScoring.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/reviews/components/ScaFlavorWheelSvg.tsx apps/mobile/src/features/reviews/components/ScaFlavorWheelSvg.test.tsx apps/mobile/src/features/reviews/components/ScaAttributeScoring.tsx apps/mobile/src/features/reviews/components/ScaAttributeScoring.test.tsx apps/mobile/src/features/recipes/RecipeContext.tsx
git commit -m "feat(mobile): add readOnly wheel mode, hideSummaryHero scoring option, and useOptionalRecipes"
```

---

### Task 5: Mobile `ReviewDetailScreen` Alignment & `Brew Again` Flow

**Files:**
- Modify: `apps/mobile/src/features/reviews/screens/ReviewDetailScreen.tsx`
- Modify: `apps/mobile/src/features/reviews/screens/ReviewDetailScreen.test.tsx`

**Interfaces:**
- Consumes: `getScaTierInfo` from `@brewlog/core`; `SegmentedControl` from `@brewlog/ui`; `ScaFlavorWheelSvg` (`readOnly`), `ScaAttributeScoring` (`hideSummaryHero`) from `../components/*`; `useOptionalStash` from `../../stash/StashContext`; `useOptionalRecipes` from `../../recipes/RecipeContext`
- Produces: `ReviewDetailScreen` matching Web-led 6-section hierarchy + mobile `BREW AGAIN` CTA below header card

- [ ] **Step 1: Update `ReviewDetailScreen.test.tsx` mocks and failing tests**

Update mocks (`react-native-svg` or `ScaFlavorWheelSvg`, `useOptionalStash`, `useOptionalRecipes`, `lucide-react-native` icons including `Play`, `CheckCircle2`). Pin these tests:
1. Section order via DOM `compareDocumentPosition`: Header Card -> `BREW AGAIN` CTA -> Hero Score Banner (`90.0`, `/ 100`, `Outstanding (SCA)`, 5-star rating, `Would Brew Again`) -> Sensory Profile (`Descriptors` / `Wheel` segmented toggle) -> 10-Attribute SCA Matrix (no duplicate `SCA SENSORY TOTAL` hero) -> Brew Parameters & Equipment -> Cupper's Tasting Notes -> `EDIT REVIEW` / `DELETE` footer.
2. Sensory Profile defaults to `Descriptors` (showing `Jasmine`, `Peach`; and `"No flavor descriptors recorded for this brew."` when empty) and toggles to `Wheel` (`ScaFlavorWheelSvg` in `readOnly` mode).
3. `BREW AGAIN` matches bean (`beanId` or `beanNameSnapshot`) via `setActiveBrewBean` and recipe (`recipeId` or `brewMethod`) via `setActiveTimerRecipe`, then navigates to `/(tabs)` with `{ mode: 'recipe' }`.
4. `BREW AGAIN` prompts with `Switch Recipe?` alert when `isBrewActive` is `true` and only resets/navigates on `Reset & Switch`; still navigates safely when no matching bean or recipe exists.

- [ ] **Step 2: Run targeted test to verify failure**

Run: `npm --workspace @brewlog/mobile test -- src/features/reviews/screens/ReviewDetailScreen.test.tsx`
Expected: FAIL because `ReviewDetailScreen` has the old section order and lacks `BREW AGAIN`, Hero Score Banner, and Sensory Profile `SegmentedControl`.

- [ ] **Step 3: Refactor `apps/mobile/src/features/reviews/screens/ReviewDetailScreen.tsx`**

Implement the 6-section Web-led hierarchy + `BREW AGAIN` CTA:
1. Header Card: `[METHOD]` left, `Date` right; Coffee Title + Roaster (prioritizing snapshot with `'Specialty Coffee'` / `'Artisan Roaster'` fallback).
2. `BREW AGAIN` primary `Pressable` (`minHeight: 44`, `Play` icon) directly below Header Card.
3. Hero Score Banner: `{calculatedScaScore.toFixed(1)}` `/ 100` + `{tier.label} (SCA)` badge on left; 5 stars + `(N/5)` + `Would Brew Again` indicator (when `review.wouldBrewAgain`) on right.
4. Sensory Profile card: `"SENSORY PROFILE"` + `<SegmentedControl size="sm" value={sensoryTab} onChange={setSensoryTab} options={[{ value: 'descriptors', label: 'Descriptors' }, { value: 'wheel', label: 'Wheel' }]} />`, rendering chips (or `"No flavor descriptors recorded for this brew."`) or `<ScaFlavorWheelSvg selectedTags={review.flavorTags || []} onToggleTag={() => {}} readOnly />`.
5. 10-Attribute SCA Matrix card: `"10-ATTRIBUTE SCA SCORE MATRIX"` + `<ScaAttributeScoring scores={review.scores} onChange={() => {}} readOnly hideSummaryHero />`.
6. Brew Parameters & Equipment card: Dose, Water, Ratio, Actual Time, Grinder & Setting, Brewer, Water Temperature.
7. Cupper's Tasting Notes card (when `review.notes`).
8. Bottom action row: `EDIT REVIEW` and `DELETE`.

- [ ] **Step 4: Run targeted test to verify pass**

Run: `npm --workspace @brewlog/mobile test -- src/features/reviews/screens/ReviewDetailScreen.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/reviews/screens/ReviewDetailScreen.tsx apps/mobile/src/features/reviews/screens/ReviewDetailScreen.test.tsx
git commit -m "feat(mobile): align ReviewDetailScreen hierarchy, sensory wheel toggle, and Brew Again"
```

---

### Task 6: Web `ReviewDetailPane` De-clutter & `ReviewsView` Catalog/Card Alignment

**Files:**
- Modify: `apps/web/src/features/reviews/ReviewDetailPane.tsx`
- Modify: `apps/web/src/features/reviews/ReviewDetailPane.test.tsx`
- Modify: `apps/web/src/features/reviews/ReviewsView.tsx`
- Modify: `apps/web/src/features/reviews/ReviewsView.test.tsx`

**Interfaces:**
- Consumes: `ReviewCard` from `./ReviewCard`; `getAvailableReviewMethodOptions`, `matchesReviewMethodFilter`, `getAvailableRatingFilterOptions`, `matchesReviewRatingFilter`, `matchesReviewSearch`, `ReviewRatingFilter` from `@brewlog/core`
- Produces: De-cluttered `ReviewDetailPane` header (Method left, Date right; `Would Brew Again` in Hero Score Banner) + `ReviewsView` master feed using `<ReviewCard />`, clear-search button, shared method `FilterPills`, and new `RatingFilter` `FilterPills` (`testID="reviews-rating-filters"`)

- [ ] **Step 1: Update `ReviewDetailPane.test.tsx` and `ReviewsView.test.tsx` with failing assertions**

- In `ReviewDetailPane.test.tsx`:
  - Assert `Would Brew Again` badge renders inside the Hero Score Banner container (not inside the `[METHOD]` + `Date` header meta row).
- In `ReviewsView.test.tsx`:
  1. Update the `"Other"` method filter test (lines 459-515) to assert `"Flair"` and `"Custom"` pills instead of `"Other"`, matching `@brewlog/core` `getAvailableReviewMethodOptions`.
  2. Add tests for `reviews-rating-filters` (`All Ratings`, `5 Stars`, `4+ Stars`), verifying filtering, hiding when no logs have `rating >= 4`, and synchronous reset when the last 5-star log is removed.
  3. Add test for search clear button (`Clear search`, `h-8 w-8`) and `"CLEAR FILTERS"` empty-state recovery when `logs.length > 0` and filters/search match zero logs.
  4. Verify feed cards inside `master-feed` render `sampleLog1.notes` snippet.

- [ ] **Step 2: Run targeted tests to verify failure**

Run: `npm --workspace @brewlog/web test -- src/features/reviews/ReviewDetailPane.test.tsx src/features/reviews/ReviewsView.test.tsx`
Expected: FAIL on `Would Brew Again` placement, `"Flair"`/`"Custom"` pills, `reviews-rating-filters`, and card notes snippet.

- [ ] **Step 3: Implement `ReviewDetailPane.tsx` and `ReviewsView.tsx` changes**

- In `ReviewDetailPane.tsx`:
  - Header meta row: `[METHOD BADGE]` on left, `formatDate(log.brewDate)` on right (`flex items-center justify-between gap-2 mb-1.5`—remove `Would Brew Again` from this row).
  - Hero Score Banner: right cluster displays 5-star rating + `(N/5)` and `{log.wouldBrewAgain && (... Would Brew Again badge ...)}`.
- In `ReviewsView.tsx`:
  - Replace local `METHOD_FILTER_OPTIONS`/`matchesReviewMethodFilter` with `getAvailableReviewMethodOptions`, `matchesReviewMethodFilter`, `getAvailableRatingFilterOptions`, `matchesReviewRatingFilter`, and `matchesReviewSearch` from `@brewlog/core`.
  - Add `selectedRatingFilter` state (`ReviewRatingFilter`), synchronous `effectiveRatingFilter`, and `useEffect` reset.
  - Add clear-search `<button type="button" aria-label="Clear search" className="... h-8 w-8 rounded-lg ...">` inside the search input wrapper.
  - Render `<FilterPills<ReviewRatingFilter> testID="reviews-rating-filters" ariaLabel="Filter reviews by rating" size="sm" ... />` below `reviews-method-filters` when `availableRatingOptions.length > 1`.
  - Replace inline card JSX with `<ReviewCard key={log.id} log={log} isSelected={isSelected} dateFormat={dateFormat} onSelect={(l) => { setSelectedLogId(l.id); setMode('view'); }} />`.
  - In `filteredLogs.length === 0`: keep `"No cupping logs match your search."` when `logs.length === 0`, and when `logs.length > 0`, show `"No reviews match your filters."` with `<Button variant="secondary" size="sm" label="CLEAR FILTERS" onClick={handleClearFilters} />`.

- [ ] **Step 4: Run targeted tests to verify pass**

Run: `npm --workspace @brewlog/web test -- src/features/reviews/ReviewDetailPane.test.tsx src/features/reviews/ReviewsView.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/reviews/ReviewDetailPane.tsx apps/web/src/features/reviews/ReviewDetailPane.test.tsx apps/web/src/features/reviews/ReviewsView.tsx apps/web/src/features/reviews/ReviewsView.test.tsx
git commit -m "feat(web): de-clutter ReviewDetailPane header and align ReviewsView filters and cards"
```

---

### Task 7: Mobile `ReviewsCatalogScreen` Alignment & Remove `ReviewsSummaryBar`

**Files:**
- Modify: `apps/mobile/src/features/reviews/screens/ReviewsCatalogScreen.tsx`
- Modify: `apps/mobile/src/features/reviews/screens/ReviewsCatalogScreen.test.tsx`
- Delete: `apps/mobile/src/features/reviews/components/ReviewsSummaryBar.tsx`
- Delete: `apps/mobile/src/features/reviews/components/ReviewsSummaryBar.test.tsx`

**Interfaces:**
- Consumes: `getAvailableReviewMethodOptions`, `matchesReviewMethodFilter`, `getAvailableRatingFilterOptions`, `matchesReviewRatingFilter`, `matchesReviewSearch`, `ReviewRatingFilter` from `@brewlog/core`
- Produces: `ReviewsCatalogScreen` without `ReviewsSummaryBar`, using `"All"` as the method all-filter label

- [ ] **Step 1: Update `ReviewsCatalogScreen.test.tsx`**

- Remove the `ReviewsSummaryBar` `87.3` average score test and assert `queryByRole('summary')` is `null` (summary bar removed).
- Assert method filter bar renders `"All"` (not `"All Methods"`).
- Keep all search, dynamic method filter, rating filter, hiding when `<= 1` option, auto-reset, and empty-state tests passing.

- [ ] **Step 2: Run targeted test to verify failure**

Run: `npm --workspace @brewlog/mobile test -- src/features/reviews/screens/ReviewsCatalogScreen.test.tsx`
Expected: FAIL because `ReviewsSummaryBar` is still rendered and `"All Methods"` is still used.

- [ ] **Step 3: Refactor `ReviewsCatalogScreen.tsx` and delete `ReviewsSummaryBar.*`**

- Remove `ReviewsSummaryBar` import, `summaryMetrics` computation, and `<ReviewsSummaryBar />` JSX.
- Delete `apps/mobile/src/features/reviews/components/ReviewsSummaryBar.tsx` and `ReviewsSummaryBar.test.tsx`.
- Replace local `KNOWN_METHOD_OPTIONS`, `formatFallbackMethodLabel`, method/rating option derivation, and search matching with `@brewlog/core` helpers (`getAvailableReviewMethodOptions`, `matchesReviewMethodFilter`, `getAvailableRatingFilterOptions`, `matchesReviewRatingFilter`, `matchesReviewSearch`), adding `accessibilityLabel: \`Filter by method ${opt.label}\`` / `\`Filter by rating ${opt.label}\`` on mapped options.

- [ ] **Step 4: Run targeted test to verify pass**

Run: `npm --workspace @brewlog/mobile test -- src/features/reviews/screens/ReviewsCatalogScreen.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/reviews/screens/ReviewsCatalogScreen.tsx apps/mobile/src/features/reviews/screens/ReviewsCatalogScreen.test.tsx
git rm apps/mobile/src/features/reviews/components/ReviewsSummaryBar.tsx apps/mobile/src/features/reviews/components/ReviewsSummaryBar.test.tsx
git commit -m "feat(mobile): align ReviewsCatalogScreen filters with core helpers and remove summary bar"
```

---

### Task 8: Full Verification, Playwright E2E, and Documentation Completion (`AGENTS.md`)

**Files:**
- Modify (if needed for new rating filter E2E coverage): `apps/web/e2e/context-features.spec.ts`
- Modify: `README.md`
- Modify: `docs/ROADMAP.md`
- Create: `docs/devlogs/2026-11-21-issue-88-align-review-detail-card-catalog.md`

- [ ] **Step 1: Add E2E check for `reviews-rating-filters` and `Flair`/`Custom` method pill parity in `apps/web/e2e/context-features.spec.ts` (if applicable)**

Verify `reviews-rating-filters` visibility when 5-star/4+-star reviews exist, keyboard arrow/Home navigation, and `>= 12px` spacing above the first review card.

- [ ] **Step 2: Run full monorepo typecheck, unit test suite, and Playwright E2E**

Run:
```bash
npm run typecheck && npm run test && npm run test:e2e
```
Expected: All 5 workspaces typecheck with 0 errors, all unit tests pass, and all Playwright E2E specs (`button-sizing-tokens`, `corner-radius-hierarchy`, `context-features`, `smoke`) pass.

- [ ] **Step 3: Complete Documentation & PR Completion Protocol (`AGENTS.md`)**

1. Update `README.md` (Key Features / remove any completed item if tracked).
2. Update `docs/ROADMAP.md` (move/mark Issue #88 milestone items completed with PR/devlog links).
3. Create `docs/devlogs/2026-11-21-issue-88-align-review-detail-card-catalog.md` documenting executive summary, architecture/deliverables across `@brewlog/core`, `apps/web`, and `apps/mobile`, safeguards, and exact observed verification results.

- [ ] **Step 4: Commit documentation and E2E updates**

```bash
git add apps/web/e2e/context-features.spec.ts README.md docs/ROADMAP.md docs/devlogs/2026-11-21-issue-88-align-review-detail-card-catalog.md
git commit -m "docs: complete issue #88 devlog, roadmap, and E2E verification"
```
