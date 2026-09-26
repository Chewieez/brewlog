# Phase 6: Free Brew (Manual Timer) & Nested Ratio Translator Design Spec

## 1. Overview & Objectives

Phase 6 introduces a flexible, unguided **Free Brew (Manual Stopwatch) Timer mode** alongside an advanced **Nested Ratio Translator** into BrewLog across mobile (`apps/mobile`) and web (`apps/web`). It expands domain calculations in `@brewlog/core` to empower brewers who brew by feel or experiment without predefined recipe stages, while preserving seamless transitions to bag stash tracking, cupping journal logging, and custom recipe creation.

### Key Goals
1. **Core Domain Math (`@brewlog/core`)**: Expand `calculator.ts` with bidirectional proportional calculations (`calculateRatio`, `calculateTargetWater`, `calculateTargetCoffee`, `solveProportionalScale`) and a split-to-recipe stage converter (`splitsToRecipeStages`).
2. **Nested Ratio Translator (`CollapsibleCalculator`)**: Integrate an accordion drawer inside the existing calculator card to input source baseline coffee:water amounts, derive implied ratios, and dynamically solve for target coffee or target water with 1-tap dose application.
3. **Free Brew Mode (Mobile & Web)**: Provide an open-ended precision stopwatch mode directly on the main Timer screen, toggled via a top segmented control (`[ GUIDED RECIPE ] | [ FREE BREW ]`), without cluttering navigation bars.
4. **Live Split & Milestone Tracking**: Enable rapid split/lap stamping during active brewing with one-tap contextual tag chips (`Bloom`, `Pour 1`, `Pour 2`, `Drawdown`), displaying cumulative time and interval deltas.
5. **Multi-Action Brew Completion**: When a Free Brew concludes, present 1-tap bag stash dose deduction, cupping journal logging (prefilling method, dose, brew time, and split milestones), and 1-tap custom recipe generation.
6. **Cross-Platform Parity**: Full parity across React Native mobile and Vite/React web timer surfaces.

---

## 2. Architecture & Domain Model (`@brewlog/core`)

### 2.1 Types (`packages/core/src/types.ts`)

```typescript
export type TimerMode = 'recipe' | 'free_brew';

export type SplitTag = 'bloom' | 'pour' | 'drawdown' | 'custom';

export interface BrewSplit {
  id: string;
  second: number;               // Elapsed second when split was recorded
  intervalSeconds: number;     // Delta seconds since the prior split (or 0)
  label: string;               // Display label (e.g. "Bloom", "Pour 1", "Drawdown")
  tag?: SplitTag;
  waterWeightGrams?: number;   // Optional target/cumulative water weight
}
```

### 2.2 Domain Calculation Helpers (`packages/core/src/calculator.ts`)

```typescript
/**
 * Computes ratio 1:X given coffee dose and total water weight.
 * Returns 0 if coffee dose is <= 0.
 */
export function calculateRatio(coffeeDoseGrams: number, waterAmountGrams: number): number;

/**
 * Computes target water weight given coffee dose and ratio 1:X.
 */
export function calculateTargetWater(coffeeDoseGrams: number, ratio: number): number;

/**
 * Computes coffee dose given target water weight and ratio 1:X.
 */
export function calculateTargetCoffee(waterAmountGrams: number, ratio: number): number;

/**
 * Solves bidirectional proportional scaling from a source baseline (coffee:water)
 * to either target coffee dose or target water amount.
 */
export interface ProportionalScaleParams {
  sourceCoffee: number;
  sourceWater: number;
  targetCoffee?: number;
  targetWater?: number;
}

export interface ProportionalScaleResult {
  ratio: number;
  targetCoffee: number;
  targetWater: number;
}

export function solveProportionalScale(params: ProportionalScaleParams): ProportionalScaleResult;

/**
 * Transforms an array of chronological manual splits into structured BrewStage[]
 * suitable for custom recipe creation.
 */
export function splitsToRecipeStages(
  splits: BrewSplit[],
  totalElapsedSeconds: number,
  totalWaterAmountGrams: number
): BrewStage[];
```

#### Calculation Rules & Edge Cases:
- **`solveProportionalScale`**:
  - `ratio = sourceWater / sourceCoffee` (if `sourceCoffee <= 0` or `sourceWater <= 0`, ratio defaults to `0`).
  - If `targetCoffee > 0`, `targetWater = Math.round(targetCoffee * ratio)`.
  - Else if `targetWater > 0` and `ratio > 0`, `targetCoffee = Number((targetWater / ratio).toFixed(1))`.
  - Output values are clamped to non-negative numbers.
- **`splitsToRecipeStages`**:
  - If `splits` is empty: returns a single stage (`id: 'stage-1'`, `name: 'Full Extraction'`, `startSecond: 0`, `durationSeconds: Math.max(1, totalElapsedSeconds)`, `targetWaterWeightGrams: totalWaterAmountGrams`).
  - If splits exist: converts each split into a stage with `startSecond` set to the previous split's timestamp (or 0 for the first stage), `durationSeconds = Math.max(1, split.second - startSecond)`.
  - The final stage covers from the last split to `totalElapsedSeconds`.
  - Target water weight is distributed progressively based on stage count or split `waterWeightGrams`.

---

## 3. Mobile Subsystem & UI (`apps/mobile`)

```
┌────────────────────────────────────────────────────────┐
│                      TimerScreen                       │
│  [ GUIDED RECIPE ]                 [ FREE BREW ]       │
├────────────────────────────────────────────────────────┤
│  MethodPills (Quick-switch presets or method tag)       │
├────────────────────────────────────────────────────────┤
│  CollapsibleCalculator                                 │
│  - Dose & Ratio (Standard)                             │
│  - [v] RATIO TRANSLATOR / CONVERTER                    │
│      Source: [ 22 ]g : [ 350 ]g  ➔  1:15.9            │
│      Target: [ 18 ]g  ➔  Water: [ 286 ]g               │
│      [ APPLY TO TIMER ]                                │
├────────────────────────────────────────────────────────┤
│  ActiveBeanPill (Pinned coffee bean from Stash)        │
├────────────────────────────────────────────────────────┤
│  TimerHero (Chassis)                                   │
│  - Mode Subtitle: FREE BREW · MANUAL STOPWATCH         │
│  - Digital Stopwatch Readout: 01:45                    │
│  - Metrics: DOSE (18g) | RATIO (1:16) | WATER (288g)   │
│  - Controls: [ START / PAUSE ] [ RESET ] [ SPLIT ]     │
│  - Quick-Tags: [ + BLOOM ] [ + POUR 1 ] [ + DRAWDOWN ] │
├────────────────────────────────────────────────────────┤
│  FreeBrewSplitTimeline                                 │
│  - Split 1: Bloom · 00:45 (+45s)                       │
│  - Split 2: First Pour · 01:30 (+45s)                  │
├────────────────────────────────────────────────────────┤
│  (On Brew Finish)                                      │
│  - BREW COMPLETE Banner                                │
│  - 1-Tap Stash Deduction                               │
│  - [ LOG TO CUPPING JOURNAL ]                          │
│  - [ SAVE AS CUSTOM RECIPE ]                           │
└────────────────────────────────────────────────────────┘
```

### 3.1 Nested Ratio Translator (`CollapsibleCalculator.tsx`)
1. **Accordion Layout**: Inside the expanded calculator card, a secondary collapsible drawer titled `"RATIO TRANSLATOR / CONVERTER"` with a toggle chevron.
2. **State Management**:
   - `sourceCoffee` and `sourceWater`: Baseline reference inputs.
   - `targetCoffee` and `targetWater`: Dynamic solved outputs.
   - `impliedRatio`: Derived automatically via `calculateRatio(sourceCoffee, sourceWater)`.
3. **Interactive Solver**:
   - Updating `targetCoffee` recalculates `targetWater`.
   - Updating `targetWater` recalculates `targetCoffee`.
4. **Application**: Tapping `APPLY TO TIMER` commits the solved `targetCoffee` (and ratio) to `onApplyDose`, triggers `mobileFeedback.triggerHapticTap()`, and shows a confirmation checkmark badge.

### 3.2 Segmented Mode Toggle & Safety Guards (`app/(tabs)/index.tsx`)
1. **Mode State**: Controlled by `timerMode: 'recipe' | 'free_brew'`.
2. **Reset Guard**: If `isRunning || (elapsedSeconds > 0 && !isFinished)`, tapping the alternate mode displays a confirmation prompt (`Alert.alert`) warning the user that switching modes will reset the active session.
3. **Preserved Context**: The active bean (`activeBrewBean`) and dialed dose (`activeTimerDose`) remain bound across mode toggles.

### 3.3 Free Brew Faceplate & Split Engine (`useMobileBrewTimer.ts`)
1. **Hook Extension**: Add `mode?: TimerMode` to `useMobileBrewTimer`.
2. **Stopwatch Logic**:
   - In `'free_brew'` mode, `totalTimeSeconds` is indefinite; progress bar represents a steady heartbeat or elapsed indicator rather than a countdown.
   - Automatic stage transition chimes and 3-2-1 countdown beeps are suppressed.
3. **Split Operations**:
   - `splits: BrewSplit[]`
   - `recordSplit(label?: string, tag?: SplitTag)`: Stamps `elapsedSeconds`, computes interval from prior split, plays subtle haptic/audio tap.
   - `removeSplit(id: string)`: Removes accidental split records.
4. **Quick Tags**:
   - Primary `SPLIT` button captures a generic or sequenced split.
   - Contextual chips (`[ + Bloom ]`, `[ + Pour 1 ]`, `[ + Pour 2 ]`, `[ + Drawdown ]`) record tagged milestones with 1 tap.

### 3.4 Live Split Timeline (`FreeBrewSplitTimeline.tsx`)
- Renders chronological list of recorded splits:
  - Split Index & Icon/Tag badge.
  - Label (`Bloom`, `First Pour`, etc.).
  - Timestamp (`01:15`).
  - Interval delta (`+45s`).
  - Discard/delete button (`X`).
- Empty state: `"No splits recorded yet. Tap SPLIT or a phase chip while brewing."`

### 3.5 Free Brew Completion & Handoffs
When the user pauses and finishes a Free Brew:
1. **1-Tap Stash Deduction**: Prompts to deduct `activeTimerDose` from `activeBrewBean` inventory.
2. **Log to Cupping Journal**: Navigates to `/cupping` with prefilled bean, method, dose, actual brew time, and formatted split summary in brew notes.
3. **Save as Custom Recipe**: Uses `splitsToRecipeStages` to generate recipe stages, navigating to the Recipe Modal (`app/recipes/modal.tsx`) with prefilled parameters so the user can title and persist the recipe.

---

## 4. Web Subsystem & UI (`apps/web`)

### 4.1 Timer View Parity (`apps/web/src/features/timer/TimerView.tsx`)
1. **Header Segmented Control**: `[ GUIDED RECIPE ] | [ FREE BREW ]` styled with Industrial Precision tokens.
2. **Left Column (Faceplate)**:
   - Digital stopwatch display (`00:00`).
   - Hardware controls: `START / PAUSE`, `RESET`, `SPLIT`.
   - Contextual Quick-Tag Chips (`Bloom`, `Pour 1`, `Pour 2`, `Drawdown`).
   - Integrated Ratio Translator collapsible panel.
3. **Right Column (Split Table)**:
   - Split log table replacing the static recipe stage timeline.
   - Live elapsed split display with cumulative and interval durations.
4. **Audio Engine (`useBrewTimer.ts`)**:
   - In `free_brew` mode, stage countdown audio ticks are silenced.
   - Recording a split emits a single clean chime via `coffeeAudio`.
5. **Completion Actions**:
   - Rate & Log to Cupping Sheet (navigates to `/cupping` with pending brew session).
   - "Save as Custom Recipe" opens `RecipeBuilderModal` with generated stages prefilled.

---

## 5. Error Handling & Edge Cases

| Scenario | Risk | Mitigation |
|---|---|---|
| Zero/Negative inputs in Translator | Division by zero, `NaN`, `Infinity` | `calculateRatio` and `solveProportionalScale` explicitly check `<= 0` and return safe defaults (`0`). |
| Free Brew finished with 0 splits | Recipe generation failure | `splitsToRecipeStages` generates a single valid stage covering total brew duration (`"Full Extraction"`). |
| Rapid / simultaneous split taps | Duplicate timestamps, 0s duration stages | Clamps stage durations to a minimum of 1 second when building recipe stages. |
| In-progress mode switch | Accidental loss of active brew timing | Native and web confirmation dialogs warn the user before resetting active sessions. |
| Backgrounding & Clock Drift | Inaccurate stopwatch timing | Both web and mobile use high-precision delta timing (`performance.now() - accumulatedMs`) resilient to background pauses. |

---

## 6. Testing & Verification Plan

### 6.1 Automated Unit Tests
- **`packages/core/src/calculator.test.ts`**:
  - `calculateRatio`: Standard proportions, decimal values (`18.5g : 287g`), zero/negative boundaries.
  - `calculateTargetWater` & `calculateTargetCoffee`: Bidirectional consistency, rounding.
  - `solveProportionalScale`: Solving for target coffee, solving for target water, missing inputs.
  - `splitsToRecipeStages`: 0 splits, 1 split, multiple tagged splits, stage water allocation.
- **`apps/mobile/src/components/timer/CollapsibleCalculator.test.tsx`**:
  - Accordion expansion/collapse.
  - Baseline coffee:water inputs and implied ratio derivation.
  - Solving for target coffee/water.
  - 1-tap `onApplyDose` invocation with haptic feedback.
- **`apps/mobile/src/components/timer/FreeBrewSplitTimeline.test.tsx`**:
  - Rendering split list with interval deltas.
  - Tag badge display and deletion handling.
- **`apps/mobile/__tests__/timerScreen.test.tsx`**:
  - Segmented mode switching (`Recipe` ↔ `Free Brew`).
  - Active brew reset confirmation dialog.
  - Live split recording and stash deduction.
- **`apps/web/src/features/timer/useBrewTimer.test.ts` & `TimerView.test.tsx`**:
  - Free brew lifecycle, split capture, recipe modal handoff.

### 6.2 Manual Verification Checklist
1. **Ratio Translator**: Expand drawer, enter 20g coffee and 300g water (1:15.0). Change target coffee to 16g -> verify water updates to 240g. Tap Apply -> verify active timer dose becomes 16g.
2. **Mode Switching**: Switch to Free Brew. Start timer. Tap Recipe mode -> confirm prompt appears. Cancel -> timer continues.
3. **Free Brew Stopwatch & Splits**: Start stopwatch. Tap `+ BLOOM` at 0:45 -> split appears with `+45s`. Tap `+ POUR 1` at 1:30 -> split appears with `+45s`.
4. **Completion Flow**: Tap Finish -> confirm summary banner appears. If bean attached, tap Deduct -> verify bag weight decreases. Tap "Save as Recipe" -> verify recipe modal opens with Bloom and Pour 1 stages prefilled.
5. **Cross-Platform Verification**: Verify desktop web at `http://localhost:5173/timer` operates with identical behavior.
