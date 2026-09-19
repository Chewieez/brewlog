# Mobile Interactive Timer Design Spec

**Date:** 2026-09-19  
**Status:** Approved  
**Topic:** Mobile Interactive Brew Timer Subsystem (`apps/mobile`)  

---

## 1. Overview & Context

In Phase 3A, BrewLog Mobile established its 5-tab navigation shell (`apps/mobile/app/(tabs)`). The primary tab route (`app/(tabs)/index.tsx`) temporarily hosted the Phase 3 smoke screen (standalone ratio calculator and a static "Start Brew Session" button). 

This design specification details the mobile interactive brew timer subsystem, shifting core brewing execution into the mobile app with high-precision timing, active stage guidance, tactile haptic feedback, audio alerts, quick-start method pills, and an integrated collapsible ratio calculator.

---

## 2. Key Requirements & User Decisions

1. **Collapsible Ratio Calculator**:
   - The user frequently uses a ratio calculator to transfer specs from external recipes into their setup.
   - The ratio calculator remains on the main Timer tab, positioned above the timer in an accordion card that **defaults to collapsed**.
   - When collapsed, the header displays a concise summary: `Ratio Calculator • 18g @ 1:16 ➔ 288.0g (Tap to expand)`.
   - When expanded, it reveals the interactive Dose and Ratio inputs with dynamic Target Water calculation.

2. **Quick-Start Method Pills**:
   - A horizontal scrollable row of pill buttons at the top of the screen (`V60`, `Chemex`, `Aeropress`, `French Press`).
   - Tapping a pill loads the default preset recipe for that method from `DEFAULT_PRESET_RECIPES` and resets the timer cleanly if not actively running.

3. **High-Precision Timing Engine**:
   - High-precision wall-clock delta timing via `performance.now()` to prevent drift when the JavaScript thread is active.
   - Integer-second state dispatches to eliminate unnecessary 60fps React re-renders over the native bridge.
   - Real-time stage detection, stage-level progress (0–100%), and total brew progress (0–100%).

4. **Sensory Feedback (Tactile + Audio)**:
   - **Tactile Haptics (`expo-haptics`)**:
     - Countdown ticks: `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)` at 3, 2, 1 seconds before stage change.
     - Stage transition: `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)` at 0:00 of the new stage.
     - Button presses: `Haptics.selectionAsync()`.
     - Simulator safety: Degrades gracefully on simulators lacking physical vibration actuators.
   - **Audio Chimes (`expo-audio`)**:
     - Subtle audio cues on stage start and countdown.
     - Header mute toggle button (`Volume2` / `VolumeX`) allows silencing audio immediately while keeping haptics active.

5. **Visual Contract & File Hygiene**:
   - 100% adherence to `INDUSTRIAL_PRECISION_THEME.colors` from `@brewlog/core` (zero raw hex codes).
   - Every modified or created file ends with exactly one trailing newline.
   - Pure native `StyleSheet.create` styling.

---

## 3. Architecture & Component Decomposition

```
apps/mobile/
├── src/
│   ├── hooks/
│   │   └── useMobileBrewTimer.ts        # Precision timing engine & stage math
│   ├── lib/
│   │   └── mobileFeedback.ts            # Haptics & audio orchestration with mute check
│   └── components/
│       └── timer/
│           ├── MethodPills.tsx          # Horizontal method switcher
│           ├── CollapsibleCalculator.tsx # Accordion ratio calculator (default collapsed)
│           ├── TimerHero.tsx            # Digital clock, progress bar, play/pause/reset
│           ├── ActiveStageCard.tsx      # Current step target water & countdown
│           └── StageTimeline.tsx        # Visual vertical step list
└── app/
    └── (tabs)/
        └── index.tsx                    # Assembled Timer tab route
```

### Component Details

#### 1. `useMobileBrewTimer.ts`
- **Input**: `recipe: BrewRecipe`.
- **Return State**:
  - `elapsedSeconds: number`: Elapsed brew seconds.
  - `remainingSeconds: number`: Remaining time to recipe target (`recipe.totalTimeSeconds - elapsedSeconds`).
  - `isRunning: boolean`: Active timing state.
  - `isFinished: boolean`: True when elapsed time >= `recipe.totalTimeSeconds`.
  - `isMuted: boolean`: Audio mute state.
  - `currentStageIndex: number`: Index into `recipe.stages`.
  - `currentStage: BrewStage`: Active stage metadata (name, duration, target water, description).
  - `nextStage: BrewStage | undefined`: Upcoming stage metadata.
  - `totalProgress: number`: Percentage completed (0 to 100).
  - `stageProgress: number`: Percentage completed of the current stage (0 to 100).
- **Return Methods**:
  - `start()`: Starts or resumes the timer.
  - `pause()`: Pauses the timer.
  - `reset()`: Resets elapsed time to 0 and reinitializes stages.
  - `toggleTimer()`: Convenience toggle between play and pause.
  - `toggleMute()`: Toggles `isMuted` boolean.

#### 2. `mobileFeedback.ts`
- Encapsulates `expo-haptics` and `expo-audio` operations.
- Guards against simulator/unsupported environments with `try/catch`.
- Respects `isMuted` parameter for audio playback while preserving haptics.

#### 3. `MethodPills.tsx`
- Horizontal scroll view with pills for V60, Chemex, Aeropress, French Press.
- Active pill styled with `colors.accent` border/background tint.
- Inactive pills styled with `colors.surface` background and `colors.textMuted` labels.

#### 4. `CollapsibleCalculator.tsx`
- Controlled or internal open/closed state defaulting to `false`.
- Pressable accordion header showing chevron icon (`ChevronDown` / `ChevronUp`) and calculated summary text.
- Expanding card exposes `Dose (g)` and `Ratio (1:X)` inputs and computed target water.

#### 5. `TimerHero.tsx`
- Displays Recipe Title, Method badge, and Audio Mute button.
- Monospaced 56px digital clock showing formatted `MM:SS`.
- Progress bar container with animated percentage fill.
- Controls bar:
  - Reset button (`RotateCcw`).
  - Large Primary Play/Pause button (`Play` / `Pause` with `colors.accent` background).
  - Quick dose indicator / stepper (`- 18g +`).

#### 6. `ActiveStageCard.tsx`
- Glowing accent card highlighting the active pour step.
- Displays:
  - Stage title (e.g., "Stage 2 of 4: Sweetness Pour").
  - Target water weight in large bold text (e.g., "Pour to 120g").
  - Countdown remaining in the active stage.
  - Pouring instructions and notes.

#### 7. `StageTimeline.tsx`
- Vertical timeline displaying all stages of the current recipe.
- Step indicators: completed checkmark (`CheckCircle2`), active step (`CircleDot` with `colors.accent`), and upcoming step (`Circle` with `colors.textMuted`).

---

## 4. State Management & Lifecycle

1. **Recipe Selection**:
   - Active recipe stored in `index.tsx` state, initialized to `DEFAULT_PRESET_RECIPES[0]` (V60 Single Cup).
   - Dose adjustment updates recipe via `rescaleRecipeDose(activeRecipe, newDose)`.
   - Switching method pills switches the active recipe and resets timer state.
2. **Timer Execution**:
   - `isRunning` triggers `useEffect` measuring delta milliseconds with `performance.now()`.
   - On second boundaries, feedback triggers check for stage start or 3-second countdown.
3. **Completion Flow**:
   - When `elapsedSeconds >= totalTimeSeconds`, `isFinished` becomes true.
   - Haptic success pulse fires and a completion banner appears with "Log to Cupping" action.

---

## 5. Verification Plan

### Automated Tests
- Unit test suite: `apps/mobile/src/hooks/useMobileBrewTimer.test.ts`:
  - Verify timer start, pause, resume, and reset.
  - Verify drift-free tick calculation with mock timers.
  - Verify accurate stage progression matching recipe stage intervals.
  - Verify total and stage progress calculations.
- Monorepo validation:
  - `pnpm -r typecheck`
  - `pnpm test`
  - `npx expo-doctor` in `apps/mobile`
  - Production Metro export: `npx expo export --platform ios` and `npx expo export --platform android`.

### Manual & Simulator Verification
- Visual inspection on iPhone 18 Pro (iOS 27.0) simulator:
  - Collapsed ratio calculator display and toggle expansion.
  - Method pill switching (V60 -> Chemex -> Aeropress).
  - Live timer start, pause, reset, and stage progression.
  - Verification of Dark Industrial Precision theme tokens across all elements.
