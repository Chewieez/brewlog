# Issue #88: Align Review Detail, Card, and Catalog Layout Order Across Mobile and Web

**Date:** 2026-11-21
**Size:** Project
**Branch:** `Chewieez/88-ui-mobile-web-align-review-detail-card-a`

## Intent & Why

Mobile (`apps/mobile`) and Web (`apps/web`) currently present the Reviews subsystem in conflicting visual hierarchies:
- **Review Detail** puts Brew Specs first on Mobile (with the SCA score buried inside section #4 and no Flavor Wheel toggle or `Brew Again` action), while Web puts Hero Score and Sensory Profile first—yet crowds `Method`, `Date`, and `Would Brew Again` into one busy header row.
- **Review Feed Cards** put Coffee/Roaster first with an Equipment Snapshot and Notes on Mobile, while Web puts Rating/SCA Tier first and omits Notes even though users enter notes in the review form.
- **Reviews Catalog** has an unused `ReviewsSummaryBar` on Mobile, `RatingFilter` only on Mobile, and divergent method filter pill labels (`All Methods` + extra slugs vs Web's `All` + `Other`).

Unifying the hierarchy around a **Web-led order**—while fixing Web's header clutter, surfacing Notes on Web cards, removing Mobile's summary card, and keeping platform-appropriate action placement—gives users one predictable mental model on both platforms.

## Goals

1. Export shared, pure review domain helpers from `@brewlog/core` (SCA tier classification, review search matching, dynamic brew-method filter options, and rating filter options/matching) so business logic cannot drift across platforms.
2. Align **Review Detail** (`ReviewDetailPane.tsx` on Web and `ReviewDetailScreen.tsx` on Mobile) to a shared 6-section hierarchy:
   1. Header & Meta (`[Method]` left, `Date` right; Bean Title & Roaster) + platform-appropriate actions (`Brew Again`, `Edit`, `Delete`)
   2. Hero Score Banner (`SCA Score / 100` + `Tier Badge` left; `5-Star Rating` + subtle `Would Brew Again` indicator right)
   3. Sensory Profile (`Descriptors` / `Wheel` segmented toggle)
   4. 10-Attribute SCA Score Matrix (without duplicate inner hero on Mobile)
   5. Brew Parameters & Equipment (Dose, Water, Ratio, Actual Time, Grinder & Setting, Brewer, Water Temp)
   6. Cupper's Tasting Notes
3. Align **Review Feed Cards** (`ReviewCard.tsx` extracted on Web and `ReviewCard.tsx` on Mobile) to a shared 5-part card structure that includes a 2-line Notes snippet on both platforms and drops the Equipment Snapshot row from Mobile cards.
4. Align **Reviews Catalog** (`ReviewsCatalogScreen.tsx` and `ReviewsView.tsx`) by removing `ReviewsSummaryBar` from Mobile, using shared dynamic Method `FilterPills` (`"All"` + present methods) and Rating `FilterPills` (`"All Ratings"`, `"5 Stars"`, `"4+ Stars"`) on both platforms, and adding clear-search ergonomics on Web.
5. Update unit tests across `@brewlog/core`, `apps/mobile`, and `apps/web`, plus verify Playwright E2E tests.

## Non-Goals & Anti-Goals

- **No changes to Review creation/editing modals or forms** (`ReviewModalScreen.tsx`, `ReviewsView.tsx` create/edit form markup), except ensuring `ScaAttributeScoring` keeps its live summary hero when `readOnly` is `false`.
- **No cross-platform domain cards inside `@brewlog/ui`:** Keep `@brewlog/ui` limited to generic stateless primitives (`FilterPills`, `SegmentedControl`, `Button`, etc.); domain-coupled review cards live in `apps/web` and `apps/mobile` using shared `@brewlog/core` helpers.
- **No lossy `"Other"` method bucket** in `reviews-method-filters`—show formatted labels for all brew methods present in the user's logs.
- **No changes to Supabase schemas or mappers** (`TastingLog` fields already support all required data).

## Constraints

- **Web E2E Button Sizing Gate (`apps/web/e2e/button-sizing-tokens.spec.ts`):** Every visible `<button>` on `/reviews` must measure `32px`, `40px`, or `48px` tall (`h-8`, `h-10`, `h-12`).
- **Web E2E Corner Radius Gate (`apps/web/e2e/corner-radius-hierarchy.spec.ts`):** Filter chips (`All`), flavor tag chips, and search controls use `rounded-lg` (`8px`); segmented thumbs use `rounded-md` (`6px`); card containers use `rounded-xl` (`12px`).
- **Web E2E Filter Spacing & Selectors (`apps/web/e2e/context-features.spec.ts`):**
  - Preserve `data-testid="reviews-method-filters"` and exact `"All"` button label on the method `FilterPills` bar.
  - Preserve `data-testid="master-feed"`, `data-testid="detail-pane"`, `data-testid="hero-score-badge"`, `data-testid="method-badge"`, and `data-testid="brew-time-telemetry"`.
  - Maintain `>= 12px` vertical spacing between the last visible filter pill and the first review card in `master-feed`.
- **Mobile Touch Targets & Read-Only Guards:**
  - Interactive targets on Mobile (`Pressable`) must maintain `>= 44px` hit height (directly or via `hitSlop`).
  - `ScaFlavorWheelSvg` on Mobile must support `readOnly` mode in `ReviewDetailScreen` so tapping a wheel slice inspects the flavor without displaying `ADD`/`REMOVE` edit buttons.
- **Documentation & PR Completion (`AGENTS.md`):** After implementation and test verification, update `README.md`, `docs/ROADMAP.md`, and create a dated devlog in `docs/devlogs/`.

## Approaches Considered

1. **Approach 1 — Shared domain helpers in `@brewlog/core` + platform-native components (Selected):**
   Extract `getScaTierInfo`, method/rating filter derivation & matching, and review search matching into `@brewlog/core`; extract a dedicated `ReviewCard.tsx` on Web; align `ReviewDetailPane.tsx`, `ReviewDetailScreen.tsx`, `ReviewsView.tsx`, `ReviewCard.tsx`, and `ReviewsCatalogScreen.tsx` using each app's native styling (`Tailwind` on Web, `makeStyles` on Mobile). Keeps `@brewlog/ui` free of `TastingLog` coupling while preventing business-rule drift.
2. **Approach 2 — Cross-platform `ReviewCard` & `ScaScoreBanner` primitives in `@brewlog/ui`:**
   Build `.web.tsx` / `.native.tsx` review cards inside `packages/ui/src/`. Rejected because `@brewlog/ui` only houses stateless UI primitives (`Button`, `Badge`, `Card`, `FilterPills`, `SegmentedControl`, `MetricTile`, `Input`) and coupling it to `TastingLog`, `SettingsContext`, and `ScaFlavorWheelSvg` adds unnecessary cross-package complexity.
3. **Approach 3 — App-local edits only (no `@brewlog/core` extraction):**
   Edit `apps/web` and `apps/mobile` independently without shared helpers. Rejected because SCA tier thresholds (`Commercial` vs `Below Specialty`) and method filter options already drifted under that pattern.

## Design Decisions

### 1. Shared Domain Helpers (`packages/core/src/reviewsUtils.ts`, exported from `packages/core/src/index.ts`)

- **`getScaTierInfo(score: number)`**:
  Returns `{ key: ScaTierKey; label: string }`:
  - `score >= 90` -> `{ key: 'outstanding', label: 'Outstanding' }`
  - `score >= 85` -> `{ key: 'excellent', label: 'Excellent' }`
  - `score >= 80` -> `{ key: 'very-good', label: 'Very Good' }`
  - `< 80` -> `{ key: 'commercial', label: 'Commercial' }`
  *(Unifies Web's `Commercial` and Mobile's prior `Below Specialty` under one canonical taxonomy; UI layers map `key` to theme colors/Tailwind classes.)*
- **Method Filtering (`getAvailableReviewMethodOptions(logs)`, `matchesReviewMethodFilter(log, filter)`)**:
  - Always starts with `{ value: 'all', label: 'All' }`.
  - Curated display labels for known `BrewMethodType` values (`v60` -> `V60`, `aeropress` -> `AeroPress`, `chemex` -> `Chemex`, `espresso` -> `Espresso`, `french-press` -> `French Press`, `kalita-wave` -> `Kalita Wave`, `flair` -> `Flair`, `origami` -> `Origami`, `clever-dripper` -> `Clever Dripper`, `moka-pot` -> `Moka Pot`, `cold-brew` -> `Cold Brew`, `custom` -> `Custom`, plus `pour-over` -> `Pour Over` for legacy logs), plus title-cased hyphen-split fallback for any unlisted method slug present in `logs`.
  - Only includes methods actually present in `logs`.
- **Rating Filtering (`ReviewRatingFilter = 'all' | '5' | '4+'`, `getAvailableRatingFilterOptions(logs)`, `matchesReviewRatingFilter(log, filter)`)**:
  - Always includes `{ value: 'all', label: 'All Ratings' }`.
  - Includes `{ value: '5', label: '5 Stars' }` if any log has `rating >= 5`, and `{ value: '4+', label: '4+ Stars' }` if any log has `rating >= 4`.
- **`matchesReviewSearch(log: TastingLog, query: string): boolean`**:
  - Case-insensitive trimmed match against `beanNameSnapshot`, `roasterSnapshot`, `notes`, and `flavorTags`.

### 2. Review Detail (`ReviewDetailPane.tsx` & `ReviewDetailScreen.tsx`)

Canonical section sequence on both platforms:

1. **Header Card & Actions**
   - **Top Meta Row:** `[METHOD BADGE]` on the left (`uppercase`), `formatDisplayDate(brewDate, dateFormat)` on the right. `Would Brew Again` is **removed** from this row to eliminate header badge clutter.
   - **Identity Block:** `beanName` as primary display heading (`h1` / `coffeeTitle`), `roaster` directly beneath (`roasterSnapshot`, with consistent bean/roaster snapshot priority).
   - **Actions (platform-idiomatic placement):**
     - **Web (`ReviewDetailPane.tsx`):** `Brew Again` (when `onBrewAgain` is provided), `Edit`, `Delete` aligned on the right of the header card.
     - **Mobile (`ReviewDetailScreen.tsx`):** Full-width primary `BREW AGAIN` button directly below the header card (matching `RecipeDetailScreen.tsx`), with `EDIT REVIEW` and `DELETE` buttons in the bottom action footer so a narrow phone viewport does not lose vertical space to a sticky 3-button header.
   - **Mobile `Brew Again` Handoff:**
     Resolves matching bean from `useOptionalStash()` (`log.beanId` or case-insensitive `log.beanNameSnapshot`) and calls `setActiveBrewBean(matchedBean)` if found; resolves matching recipe from `useOptionalRecipes()` (`log.recipeId` or `r.brewMethod === log.brewMethod`) and calls `setActiveTimerRecipe(matchedRecipe, log.coffeeDoseGrams > 0 ? log.coffeeDoseGrams : matchedRecipe.coffeeDoseGrams)` if found (prompting with the `Switch Recipe?` alert when `isBrewActive` is `true`, matching `RecipeDetailScreen.tsx`), then navigates via `router.replace({ pathname: '/(tabs)', params: { mode: 'recipe' } })`.

2. **Hero Score Banner**
   - **Left:** Numeric `calculatedScaScore.toFixed(1)` + `/ 100`, vertical divider, and SCA Tier pill (`{tier.label} (SCA)`).
   - **Right:** 5-star rating display (`(N/5)` on Web, stars + `(N/5)` on Mobile) and, when `log.wouldBrewAgain` is `true`, a clean `Would Brew Again` badge/indicator in the same cluster (so it stays high-visibility without cluttering the Method/Date row).

3. **Sensory Profile**
   - Header row with `"Sensory Profile"` title and segmented toggle (`Descriptors` | `Wheel`). On Mobile, use `@brewlog/ui` `SegmentedControl` (`size="sm"`).
   - `Descriptors` tab: flavor tag chips, or `"No flavor descriptors recorded for this brew."` when `flavorTags` is empty.
   - `Wheel` tab: `ScaFlavorWheelSvg` in read-only mode. Add `readOnly?: boolean` prop to Mobile `ScaFlavorWheelSvg.tsx` so tapping a slice inspects the descriptor/category name in the center hole without showing an `ADD`/`REMOVE` button.

4. **10-Attribute SCA Score Matrix**
   - Renders the 10 SCA attribute bars (`Fragrance / Aroma` through `Overall`).
   - On Mobile, add `hideSummaryHero?: boolean` (default `false`) to `ScaAttributeScoring.tsx` and pass `hideSummaryHero={true}` from `ReviewDetailScreen.tsx` so the duplicate `SCA SENSORY TOTAL` card is omitted in detail view while `ReviewModalScreen.tsx` retains its live scoring hero during editing. Also update `ScaAttributeScoring.tsx`'s tier helper to use `getScaTierInfo` from `@brewlog/core` (aligning `< 80` to `Commercial` or keeping `(SCA)` tier parity).

5. **Brew Parameters & Equipment**
   - **Telemetry Grid:** `Dose`, `Water`, `Ratio` (`1:X.X`), `Actual Time` (neutral foreground color).
   - **Equipment & Temp Grid:** `Grinder & Setting`, `Brewer`, `Water Temperature` (`°C` or `Not recorded`).

6. **Cupper's Tasting Notes**
   - Rendered when `log.notes` is non-empty, below Brew Parameters & Equipment.

### 3. Review Feed Card (`apps/web/src/features/reviews/ReviewCard.tsx` & `apps/mobile/src/features/reviews/components/ReviewCard.tsx`)

Extract Web's inline card JSX in `ReviewsView.tsx` into `apps/web/src/features/reviews/ReviewCard.tsx` and align both Web and Mobile `ReviewCard` to the exact same 5-part vertical order:

1. **Header Row:**
   - Left: Star rating (`★ {log.rating || '—'}` on Web; star icon + rating value or 5-star compact display on Mobile — use `★ {rating || '—'}` or 5-star row? Use single `Star` + numeric rating `{review.rating || '—'}` on both for scannable parity!).
   - Right: Numeric SCA score (`calculatedScaScore.toFixed(1)`) + SCA Tier badge (`getScaTierInfo(score).label`).
2. **Identity:** Coffee Name (`beanNameSnapshot`) above Roaster (`roasterSnapshot`).
3. **Flavor Tags:** Up to 3 tag chips + `+{count - 3}` overflow label (omitted when empty).
4. **Notes Snippet:** 2-line clamped italic preview (`line-clamp-2` on Web, `numberOfLines={2}` on Mobile) when `notes` is non-empty.
5. **Telemetry Footer:** `[METHOD BADGE] • {dose}g:{water}g • {formattedTime}` on the left; `formatDisplayDate(brewDate, dateFormat)` on the right.

*(Mobile `ReviewCard.tsx` drops the Equipment Snapshot row from the feed card; equipment remains visible in `ReviewDetailScreen`.)*

### 4. Reviews Catalog (`ReviewsCatalogScreen.tsx` & `ReviewsView.tsx`)

- **Remove `ReviewsSummaryBar`:** Remove `ReviewsSummaryBar` from `ReviewsCatalogScreen.tsx` and delete the now-unused `apps/mobile/src/features/reviews/components/ReviewsSummaryBar.tsx` and `ReviewsSummaryBar.test.tsx`.
- **Aligned Header & Filters:**
  1. Screen header + primary CTA (`ADD REVIEW` on Mobile; `LOG REVIEW` on Web, plus `{logs.length} logged review(s)` count on Web).
  2. Search bar using `matchesReviewSearch` (with clear button on both Web and Mobile; Web clear button `h-8 w-8 rounded-lg`).
  3. Method `FilterPills` (`testID="reviews-method-filters"`) populated via `getAvailableReviewMethodOptions(logs)` (`"All"` + present methods), hidden when `<= 1` option, with synchronous `effectiveMethodFilter` fallback + `useEffect` reset.
  4. Rating `FilterPills` (`testID="reviews-rating-filters"`) populated via `getAvailableRatingFilterOptions(logs)` (`"All Ratings"`, `"5 Stars"`, `"4+ Stars"`), hidden when `<= 1` option, with synchronous `effectiveRatingFilter` fallback + `useEffect` reset.
  5. Feed list of `ReviewCard` items + `"CLEAR FILTERS"` recovery empty state when filters/search match zero logs.

## Left to the Builder

- Exact Tailwind utility classes and `makeStyles` token mappings (preserving existing theme tokens, corner radii, `h-8`/`h-10`/`h-12` button sizing on Web, and `minHeight: 44` touch targets on Mobile).
- Time formatting choice (`3m 30s` vs `3:30`) where existing tests do not pin one format—prefer consistent helper formatting across Web and Mobile while keeping `ReviewDetailPane.test.tsx` and `ReviewDetailScreen.test.tsx` assertions green.
- Updating unit tests (`packages/core`, `ReviewDetailPane.test.tsx`, `ReviewsView.test.tsx`, `ReviewDetailScreen.test.tsx`, `ReviewCard.test.tsx`, `ReviewsCatalogScreen.test.tsx`, `ScaAttributeScoring.test.tsx`), running Playwright E2E tests (`apps/web/e2e`), and completing `README.md`, `docs/ROADMAP.md`, and `docs/devlogs/` documentation.
