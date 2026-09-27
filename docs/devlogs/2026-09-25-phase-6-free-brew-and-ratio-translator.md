# 📖 Devlog: Phase 6 Free Brew (Manual Stopwatch) & Nested Ratio Translator

- **Date**: 2026-09-25
- **Milestone**: Phase 6 (Free Brew & Nested Ratio Translator)
- **Status**: Completed & Verified ✅
- **Branch**: `feature/phase-6-free-brew`
- **Tech Stack**: Expo SDK 57, React Native 0.86.3, React 19.2.8, React Router v8, `@brewlog/core`, `@brewlog/supabase`, Vite, Tailwind CSS v4, `expo-haptics`, `lucide-react-native`, `lucide-react`

---

## 🎯 Executive Summary

Following the completion of the interactive brew timer (Phase 3B), Supabase authentication with secure storage (Phase 3C), mobile Recipe Studio (Phase 4), and Stash Cellar inventory (Phase 5), Phase 6 delivers **Free Brew Mode** and the **Nested Ratio Translator** across mobile (`apps/mobile`) and web (`apps/web`).

While structured recipes with predefined stages are ideal for repeatability, baristas frequently dial in new coffees by feel, adapt to grind variance on the fly, or experiment with unguided pulse pours. Prior to Phase 6, the timer required a selected recipe and forced fixed countdown intervals. Furthermore, scaling recipes or recalculating liquid volume ratios required manual mental math.

Phase 6 addresses both requirements while maintaining seamless interoperability with the coffee cellar and sensory logging subsystems:
1. **Core Proportional Math Engine (`calculator.ts`)**: Pure mathematical helpers in `@brewlog/core` calculating implied brew ratios ($1:X$), target water from dose, target dose from water, and solving proportional conversions with division-by-zero guards. Includes `splitsToRecipeStages` to automatically convert manual split intervals into structured recipe stages.
2. **Dual-Mode Timing State Machine (`useMobileBrewTimer` / `useBrewTimer`)**: Extended timer hooks with a `TimerMode` toggle (`'recipe' | 'free_brew'`). Free Brew mode runs as an open-ended count-up precision stopwatch, muting recipe countdown ticks while supporting interval split stamping.
3. **Chassis Mode Switcher**: Added a top segmented control `[ GUIDED RECIPE ] | [ FREE BREW ]` on both mobile (`app/(tabs)/index.tsx`) and web (`TimerView.tsx`) with an active-brew confirmation guard against accidental state wipes.
4. **Live Split & Milestone Stamping (`FreeBrewSplitTimeline`)**: Baristas can record split milestones during active extraction with single-tap contextual tags (`Bloom`, `Pour 1`, `Pour 2`, `Drawdown`), displaying cumulative elapsed time and interval delta durations ($\Delta t$).
5. **Nested Ratio Translator Drawer**: Built a collapsible proportional converter (`CollapsibleCalculator` on mobile, `WebRatioTranslator` on web) allowing baristas to dial in baseline doses and water targets, derive implied ratios, solve for target amounts, and apply doses with 1-tap.
6. **Multi-Action Completion Flow**: When a Free Brew finishes, baristas are presented with 3 instant pathways:
   - **1-Tap Stash Deduction**: Directly deducts extracted coffee dose from the active cellar bag.
   - **Pre-Populated Cupping Log**: Exports extraction parameters, dose, duration, and split milestone notes into a new tasting review.
   - **Save as Custom Recipe**: Converts recorded split timestamps into a formal multi-stage recipe and routes directly into the Recipe Builder.

---

## 🏗️ Architecture & Component Decomposition

```
packages/core/
└── src/
    ├── types.ts                        # TimerMode, BrewSplit, SplitTag, ProportionalScaleParams
    ├── calculator.ts                   # calculateRatio, calculateTargetWater, calculateTargetCoffee,
    │                                   # solveProportionalScale, splitsToRecipeStages
    └── __tests__/
        └── calculator.test.ts          # 22 unit tests for proportional scaling & stage synthesis

apps/mobile/
├── app/(tabs)/
│   └── index.tsx                       # Main timer screen with mode switcher & FreeBrewSplitTimeline
└── src/features/timer/
    ├── hooks/
    │   ├── useMobileBrewTimer.ts       # Unified timer hook supporting 'recipe' & 'free_brew'
    │   └── useMobileBrewTimer.test.ts  # 15 unit tests covering stopwatch & split stamping
    └── components/
        ├── FreeBrewSplitTimeline.tsx   # Native split milestones list with tag chips
        ├── FreeBrewSplitTimeline.test.tsx # 6 unit tests
        └── CollapsibleCalculator.tsx   # Nested ratio translator with proportional solver

apps/web/
└── src/features/timer/
    ├── hooks/
    │   ├── useBrewTimer.ts             # Web timer hook with dual-mode stopwatch support
    │   └── useBrewTimer.test.ts        # 12 unit tests
    ├── components/
    │   ├── FreeBrewSplitTimeline.tsx   # Semantic web split milestones display
    │   └── WebRatioTranslator.tsx      # Web ratio translator drawer
    └── TimerView.tsx                   # Web chassis with mode switcher & multi-action completion
```

---

## 🔍 Key Implementations & Mathematical Deep-Dive

### 1. Bidirectional Proportional Scaling Engine (`calculator.ts`)

To solve proportional coffee and water relationships bidirectionally:
- **Implied Ratio**:
  $$\text{ratio} = \frac{W_{\text{source}}}{C_{\text{source}}}$$
- **Target Water** (solving for water given target coffee $C_{\text{target}}$):
  $$W_{\text{target}} = \text{round}(C_{\text{target}} \times \text{ratio})$$
- **Target Coffee** (solving for coffee given target water $W_{\text{target}}$):
  $$C_{\text{target}} = \text{round}\left(\frac{W_{\text{target}}}{\text{ratio}}, 1\right)$$

All functions include division-by-zero guards, returning 0 when inputs are non-positive.

### 2. Converting Manual Splits to Structured Recipe Stages (`splitsToRecipeStages`)

When converting a free-form extraction into a permanent recipe:
- The engine calculates stage duration as the delta seconds between consecutive split timestamps:
  $$\Delta t_k = t_k - t_{k-1}$$
- Assigns semantic stage types (`bloom`, `pour`, `wait`) based on tagged split labels (`Bloom`, `Pour 1`, `Drawdown`).
- Guarantees valid sequential timing and positive durations suitable for the Recipe Studio lifecycle.

---

## 🧪 Verification & Test Results

- **`@brewlog/core`**: 66 passing unit tests (22 added for proportional math and split conversion).
- **`@brewlog/mobile`**: 277 passing unit tests (including stopwatch timing, split list rendering, and ratio drawer).
- **`@brewlog/web`**: 99 passing unit tests (including web mode switcher and finish banners).
- **Monorepo Total**: 442 unit tests passing with zero TypeScript errors.
