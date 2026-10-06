# Web Reviews & Cupping Journal Redesign Spec

**Date:** 2026-10-04  
**Status:** Approved  
**Topic:** Web Reviews & Sensory Logbook Master-Detail Redesign (`apps/web`)  

---

## 1. Overview & Problem Statement

In the initial implementation of the Reviews feature on the web (`apps/web/src/features/reviews/ReviewsView.tsx`), the screen defaulted to displaying a massive, empty review creation form consisting of two mismatched columns (10 SCA scoring sliders on the left, an artificially capped 440px sensory panel on the right). Existing reviews were pushed below the fold to the bottom of the screen.

### Identified Deficiencies:
1. **Inverted Information Architecture**: Users visit the Reviews tab to inspect their past coffee tasting logs far more frequently than they brew and log a new cup. Dominating the viewport with an empty form obscured past reviews.
2. **Missing Edit Workflow**: There was no mechanism to edit or update an existing review after submission (`onUpdateTastingLog` was absent).
3. **Mismatched Heights & Competing Scroll Containers**: The left column of the form stretched to ~1,400px while the right sensory panel was locked to `max-h-[440px]` with its own internal scrollbar, cutting off categories.
4. **Color & Hierarchy Flaws**:
   - `Actual Brew Time` input was colored orange (`text-accent`), inappropriately highlighting one field over adjacent inputs like dose and water.
   - The calculated cup score badge (`XX.X / 100 | Classification`) wrapped erratically on smaller or medium viewports.
   - The score reset control was redundantly labeled `Clear (0)` instead of `Clear`.
5. **Typography Inconsistencies (Overuse of JetBrains Mono)**:
   - Monospace (`font-mono`) was inappropriately applied to normal words and lowercase sentences: flavor tags (`Peach`, `Jasmine`), grinder descriptions (`Comandante C40 @ 14 clicks`), grind setting inputs (`Medium-Fine`), instructions below the wheel (`Use ← → to rotate...`), and button labels.
   - Monospace was applied to input numbers where Outfit sans with tabular numbers (`font-sans tabular-nums`) provides a cleaner, more refined aesthetic.
6. **Sensory Tab Ergonomics**: The interactive SVG wheel was the default tab even though picking chips from the `Tag List / Descriptors` tab is faster and more ergonomic for most users.

---

## 2. Layout Architecture: Master-Detail Cupping Journal

To align with the high-precision, tactile aesthetic of BrewLog, the Reviews screen transitions to a **Master-Detail Cupping Journal** layout with an **in-place single-column right pane**:

```
┌────────────────────────────────────────────────────────────────────────┐
│  Reviews & Cupping Journal                                [+ LOG REVIEW]│
│  Specialty Coffee Association sensory logbook & cup profiles           │
├──────────────────────┬─────────────────────────────────────────────────┤
│  LEFT: Master Feed   │  RIGHT: Single-Column Detail / Editor Pane      │
│  (38% width)         │  (62% width)                                    │
│                      │                                                 │
│  [🔍 Search logs...] │  [READ MODE: Sensory Profile Inspector]         │
│  [All][V60][Aero]... │  ┌───────────────────────────────────────────┐  │
│  ──────────────────  │  │ Worka Sakaro — Sey Coffee                 │  │
│  ┌────────────────┐  │  │ V60 • Oct 4, 2026 • 88.5 Excellent (SCA) │  │
│  │ ★★★★★  88.5    │  │  │ [Edit Review] [Brew Again] [Delete]       │  │
│  │ Worka Sakaro   │  │  ├───────────────────────────────────────────┤  │
│  │ Sey Coffee     │  │  │ Hero Score: 88.5 / 100 | Excellent        │  │
│  │ [Peach][Jasmine│  │  ├───────────────────────────────────────────┤  │
│  │ 20g:300g • 3m30│  │  │ SCA Sensory Profile (Wheel / Descriptors) │  │
│  └────────────────┘  │  ├───────────────────────────────────────────┤  │
│  ┌────────────────┐  │  │ 10-Attribute SCA Score Breakdown Bars     │  │
│  │ ★★★★☆  83.0    │  │  ├───────────────────────────────────────────┤  │
│  │ El Paraiso     │  │  │ Brew Specs (Dose, Water, Temp, Grinder)   │  │
│  │ Manhattan      │  │  ├───────────────────────────────────────────┤  │
│  │ [Strawberry]   │  │  │ Cupper's Notes & Impressions              │  │
│  │ 15g:250g • 2m45│  │  └───────────────────────────────────────────┘  │
│  └────────────────┘  │                                                 │
└──────────────────────┴─────────────────────────────────────────────────┘
```

---

## 3. Left Pane: Master Cupping Feed

### 3.1 Search & Filter Bar
- **Search Input**: Real-time filtering by coffee bean name, roaster name, flavor tags, and cupper notes.
- **Method Filter Chips**: Horizontal pills (`All`, `V60`, `AeroPress`, `Chemex`, `Espresso`, `French Press`, `Kalita Wave`, `Other`) with accent active state.
- **Header Action**: Prominent `+ LOG REVIEW` button in page header.

### 3.2 Cupping Card Structure
Each card in the master list provides high-density, tactile telemetry:
- **Header**: Star rating (`★ 4.5`) + SCA Score Badge with color tiers:
  - 90.0+: `text-emerald-300 bg-emerald-950/50 border-emerald-800` (`Outstanding`)
  - 85.0–89.9: `text-accent bg-panel-recessed border-accent/50` (`Excellent`)
  - 80.0–84.9: `text-zinc-200 bg-panel-recessed border-zinc-700` (`Very Good`)
  - <80.0: `text-zinc-400 bg-zinc-900 border-zinc-800` (`Commercial`)
- **Coffee Title**: Bean name in bold Outfit sans + roaster subtitle.
- **Sensory Badges**: Flavor descriptor chips rendered in `font-sans text-xs` (not monospace).
- **Brew Telemetry**: Method badge, brew ratio / dose (`20g : 300g`), brew time (`3m 30s`), and formatted date.
- **Active State**: Selected card is highlighted with a left border accent bar and elevated panel background.

---

## 4. Right Pane: Single-Column Layout & In-Place Transitions

The right pane occupies 62% of the desktop grid and maintains a **strict single-column vertical flow** (no nested side-by-side columns causing height mismatches).

### 4.1 Mode 1: Sensory Profile Inspector (Read Mode)
Displayed when a review is selected from the feed:
1. **Header & Action Bar**:
   - Title (Coffee Name & Roaster) + Date + Brew Method.
   - Action Buttons:
     - `Edit Review`: Switches right pane into Edit Mode with data pre-populated.
     - `Brew Again`: Transfers coffee and brew parameters directly to the Brew Timer.
     - `Delete`: Opens a confirmation modal before deleting.
2. **Hero Cup Score**:
   - Single horizontal row: `88.5` (`text-3xl font-light text-text-primary tabular-nums`), `/ 100`, divider, and the SCA classification tier badge. Formatted with `whitespace-nowrap` to prevent awkward line breaks.
3. **Interactive Sensory Profile**:
   - Segmented toggle: **Descriptors (Tag List)** (default) and **Wheel**.
   - Highlights the descriptors selected for this cup in copper accent color.
4. **10-Attribute Score Matrix**:
   - 10 horizontal meter bars showing scores for Fragrance/Aroma, Flavor, Aftertaste, Acidity, Body, Balance, Clean Cup, Sweetness, Uniformity, and Overall.
5. **Brew Parameters & Equipment Specs**:
   - Inset hardware panel displaying: Coffee dose, water amount, calculated ratio (e.g. `1:15.0`), brew time in neutral text, water temp, grinder, grind setting, and brewer.
6. **Cupper's Tasting Notes**:
   - Formatted quote block with tasting impressions, star rating, and "Would brew again" badge.

### 4.2 Mode 2: Review Editor (Create & Edit Modes)
Displayed when clicking `+ LOG REVIEW` or `Edit Review`:
1. **Sticky Header**:
   - Mode title (`Log New Brew Review` or `Edit Review: [Bean Name]`).
   - `Cancel` button (returns to Read Mode).
   - `Save Review` / `Save Changes` button with loading state.
   - Live Calculated Score pill showing the real-time score.
2. **Sequential Vertical Sections**:
   - **Section 1: Coffee & Brew Parameters**: Stash selection or custom bean/roaster, brew method, dose, water, brew time (`text-zinc-100`), grinder, grind setting (`font-sans`), brewer, water temp.
   - **Section 2: SCA Sensory Wheel & Descriptors**:
     - Pinned Selected Tags Bar with 1-click removal.
     - Segmented toggle defaulting to **Descriptors (Tag List)** first, **Wheel** second.
     - Naturally flowing height without nested 440px scroll traps.
   - **Section 3: 10 SCA Attribute Sliders**:
     - Top controls: `Baseline (82.5)` and `Clear` (simplified from `Clear (0)`).
     - Full-width qualitative sliders (0.0–10.0 in 0.1 increments).
     - Purity sliders (0.0–10.0 in 0.5 increments).
     - Numerical scores in `font-sans tabular-nums`.
   - **Section 4: Impressions & Rating**:
     - Tasting notes textarea, 5-star rating control, and "Would brew again" checkbox.

---

## 5. Data Flow & CRUD Enhancements

### 5.1 Store Methods in `useReviews.ts`
```typescript
interface UseReviewsReturn {
  logs: TastingLog[];
  loading: boolean;
  addReview: (log: Omit<TastingLog, 'id' | 'createdAt'>) => Promise<TastingLog>;
  updateReview: (id: string, updates: Partial<TastingLog>) => Promise<TastingLog | void>;
  deleteReview: (id: string) => Promise<void>;
  refreshLogs: () => Promise<void>;
}
```

### 5.2 Context Propagation
- Expose `onUpdateTastingLog` and `onDeleteTastingLog` through `RootLayout.tsx` and `useRootOutletContext()`.
- Pass to `ReviewsRoute.tsx` and into `ReviewsView.tsx`.

---

## 6. Typography & UI Polish Rules

| Element | Old Style | New Style | Rationale |
| :--- | :--- | :--- | :--- |
| **Actual Brew Time Input** | `text-accent font-mono font-bold` | `text-zinc-100 font-sans font-medium` | Remove glaring orange; align with Dose and Water inputs. |
| **Score Fraction Badge** | Broken wrapping `/ 100` | `whitespace-nowrap flex items-center gap-2` | Clean, unbreakable horizontal presentation. |
| **Clear Button** | `Clear (0)` | `Clear` | Eliminate redundant numerical indicator. |
| **Flavor Badges** | `font-mono text-[11px]` | `font-sans text-xs font-medium` | Flavor notes are descriptive words, not code tokens. |
| **Grinder / Equipment Text** | `font-mono` | `font-sans` | Brand names and models belong in body sans typography. |
| **Grind Setting Input** | `font-mono` | `font-sans` | Accepts text strings like `Medium-Fine`. |
| **Wheel Helper Text** | `font-mono` | `font-sans` | Instructions are natural language, not terminal commands. |
| **Slider Numbers** | `font-mono tabular-nums` | `font-sans tabular-nums` | Outfit provides refined tabular figures without monospace distortion. |
| **Sensory Panel Tabs** | Wheel first, Tags second | **Descriptors first, Wheel second** | Click-to-select chips are faster and more ergonomic than rotating the SVG wheel. |
| **Sensory Container Height** | `max-h-[440px]` scrollbox | Single column natural flow | Eliminates disjointed height mismatch with sliders. |

---

## 7. Extensibility for Simple vs. Advanced Reviews

To prepare for future "Simple" vs. "Advanced" logging:
- The form is cleanly structured into two logical tiers:
  1. **Core / Simple Tier**: Coffee, method, dose, yield, star rating, flavor descriptors, notes.
  2. **Specialty / Advanced Tier**: 10 SCA attribute sliders (Fragrance, Acidity, Clean Cup, etc.) and calculated SCA score.
- In this redesign, both tiers are organized in separate vertical sections within the single column. A future configuration toggle between `Simple` and `Advanced` can conditionally hide the SCA Attribute Sliders and calculated score without restructuring components or database schemas.

---

## 8. Verification & Testing

1. **Unit & Component Tests**:
   - `useReviews.test.ts`: Test `addReview`, `updateReview`, and `deleteReview` against both local fallback and Supabase mock.
   - `ReviewsView.test.tsx`:
     - Verify master-detail feed renders cards and selection updates the detail pane.
     - Verify clicking `+ LOG REVIEW` opens Create Mode in the right pane.
     - Verify clicking `Edit Review` loads review data into Edit Mode.
     - Verify saving an edited review triggers `onUpdateTastingLog` and updates the active card.
     - Verify deleting a review triggers `onDeleteTastingLog`.
     - Verify search input and brew method filter chips filter cards correctly.
     - Verify typography classes (`font-sans`, removal of `font-mono` from descriptors and equipment).
     - Verify `Actual Brew Time` does not have `text-accent`.
     - Verify "Clear" button label.
2. **Browser DevTools Verification**:
   - Use `chrome-devtools-mcp` to inspect [`http://localhost:3000/reviews`](http://localhost:3000/reviews), verify responsive layout on desktop and mobile, and capture screenshots confirming visual harmony.
