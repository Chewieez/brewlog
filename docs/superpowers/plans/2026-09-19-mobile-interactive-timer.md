# Mobile Interactive Brew Timer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the mobile interactive brew timer subsystem with 1-to-1 hardware faceplate visual parity with the web app, drift-free wall-clock timing, tactile and audio feedback, quick-start method pills, and a collapsible standalone ratio calculator.

**Architecture:** Decompose the timer feature into a precision timing hook (`useMobileBrewTimer`), sensory feedback manager (`mobileFeedback.ts`), and modular native UI components (`MethodPills`, `CollapsibleCalculator`, `TimerHero`, `ActiveStageCard`, `StageTimeline`) assembled in `apps/mobile/app/(tabs)/index.tsx`.

**Tech Stack:** React Native 0.86, Expo SDK 57, Expo Router, `expo-haptics`, `expo-audio`, `lucide-react-native`, `@brewlog/core`, TypeScript, Vitest.

**Spec:** [`docs/superpowers/specs/2026-09-19-mobile-interactive-timer-design.md`](file:///Users/greglawrence/Projects/brewlog/docs/superpowers/specs/2026-09-19-mobile-interactive-timer-design.md)

## Global Constraints

- **Theme Contract:** Zero raw hex values; all colors strictly imported from `INDUSTRIAL_PRECISION_THEME.colors` in `@brewlog/core`.
- **File Hygiene:** Exactly one trailing newline at the end of every file.
- **Styling Architecture:** Pure `StyleSheet.create` (no inline object literals or external CSS engines).
- **Web Parity:** Match the physical instrument faceplate aesthetic from `apps/web/src/features/timer/TimerView.tsx` (oversized monospaced digital clock, chassis metrics grid with hairline dividers, uppercase bold action button, square-rounded reset/mute buttons).

---

### Task 1: Sensory Feedback Utilities & Dependencies

**Files:**
- Modify: `apps/mobile/package.json`
- Create: `apps/mobile/src/lib/mobileFeedback.ts`

**Interfaces:**
- Produces:
  - `mobileFeedback.triggerHapticCountdown(): Promise<void>`
  - `mobileFeedback.triggerHapticStageTransition(): Promise<void>`
  - `mobileFeedback.triggerHapticBrewComplete(): Promise<void>`
  - `mobileFeedback.triggerHapticTap(): Promise<void>`
  - `mobileFeedback.playChime(isMuted: boolean): Promise<void>`

- [ ] **Step 1: Install `expo-haptics`, `expo-audio`, and add `vitest`**

Run:
```bash
cd apps/mobile && npx expo install expo-haptics expo-audio
pnpm --filter @brewlog/mobile add -D vitest @types/react-native
```

Update `apps/mobile/package.json` scripts to include `"test": "vitest run"`.

- [ ] **Step 2: Implement `mobileFeedback.ts`**

Write `apps/mobile/src/lib/mobileFeedback.ts`:
```typescript
import * as Haptics from 'expo-haptics';

export const mobileFeedback = {
  triggerHapticCountdown: async (): Promise<void> => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Degrades gracefully on simulators without haptic actuators
    }
  },

  triggerHapticStageTransition: async (): Promise<void> => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Degrades gracefully on simulators
    }
  },

  triggerHapticBrewComplete: async (): Promise<void> => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Degrades gracefully on simulators
    }
  },

  triggerHapticTap: async (): Promise<void> => {
    try {
      await Haptics.selectionAsync();
    } catch {
      // Degrades gracefully on simulators
    }
  },

  playChime: async (isMuted: boolean): Promise<void> => {
    if (isMuted) return;
    try {
      // Audio chime cue
    } catch {
      // Degrades gracefully
    }
  },
};
```

- [ ] **Step 3: Verify build and exports**

Run:
```bash
pnpm --filter @brewlog/mobile typecheck
```
Expected: PASS with 0 errors.

- [ ] **Step 4: Commit Task 1**

```bash
git add apps/mobile/package.json apps/mobile/src/lib/mobileFeedback.ts pnpm-lock.yaml
git commit -m "feat(mobile): add sensory feedback utilities and dependencies"
```

---

### Task 2: Core Drift-Free Timing Hook (`useMobileBrewTimer`)

**Files:**
- Create: `apps/mobile/src/hooks/useMobileBrewTimer.test.ts`
- Create: `apps/mobile/src/hooks/useMobileBrewTimer.ts`

**Interfaces:**
- Consumes: `BrewRecipe`, `BrewStage` from `@brewlog/core`
- Produces: `useMobileBrewTimer(recipe: BrewRecipe): UseMobileBrewTimerReturn`

- [ ] **Step 1: Write failing unit test for `useMobileBrewTimer`**

Create `apps/mobile/src/hooks/useMobileBrewTimer.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMobileBrewTimer } from './useMobileBrewTimer';
import { DEFAULT_PRESET_RECIPES } from '@brewlog/core';

describe('useMobileBrewTimer', () => {
  const recipe = DEFAULT_PRESET_RECIPES[0]; // V60 Single Cup (4:6 Method)

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with zero elapsed time and default stage', () => {
    const { result } = renderHook(() => useMobileBrewTimer(recipe));
    expect(result.current.elapsedSeconds).toBe(0);
    expect(result.current.isRunning).toBe(false);
    expect(result.current.isFinished).toBe(false);
    expect(result.current.currentStageIndex).toBe(0);
    expect(result.current.currentStage.name).toBe(recipe.stages[0].name);
  });

  it('starts, pauses, and resumes timing', () => {
    const { result } = renderHook(() => useMobileBrewTimer(recipe));
    
    act(() => {
      result.current.start();
    });
    expect(result.current.isRunning).toBe(true);

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current.elapsedSeconds).toBe(5);

    act(() => {
      result.current.pause();
    });
    expect(result.current.isRunning).toBe(false);
    expect(result.current.elapsedSeconds).toBe(5);
  });

  it('resets timer back to zero', () => {
    const { result } = renderHook(() => useMobileBrewTimer(recipe));
    
    act(() => {
      result.current.start();
      vi.advanceTimersByTime(10000);
    });
    expect(result.current.elapsedSeconds).toBe(10);

    act(() => {
      result.current.reset();
    });
    expect(result.current.elapsedSeconds).toBe(0);
    expect(result.current.isRunning).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run:
```bash
pnpm --filter @brewlog/mobile test
```
Expected: FAIL ("Cannot find module './useMobileBrewTimer'")

- [ ] **Step 3: Implement `useMobileBrewTimer.ts`**

Write `apps/mobile/src/hooks/useMobileBrewTimer.ts`:
```typescript
import { useState, useEffect, useRef, useCallback } from 'react';
import { BrewRecipe, BrewStage } from '@brewlog/core';
import { mobileFeedback } from '../lib/mobileFeedback';

export interface UseMobileBrewTimerReturn {
  elapsedSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  isFinished: boolean;
  isMuted: boolean;
  currentStageIndex: number;
  currentStage: BrewStage;
  nextStage: BrewStage | undefined;
  totalProgress: number;
  stageProgress: number;
  start: () => void;
  pause: () => void;
  reset: () => void;
  toggleTimer: () => void;
  toggleMute: () => void;
}

export const useMobileBrewTimer = (recipe: BrewRecipe): UseMobileBrewTimerReturn => {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const startTimeRef = useRef<number>(0);
  const accumulatedMsRef = useRef<number>(0);
  const recipeRef = useRef<BrewRecipe>(recipe);
  recipeRef.current = recipe;

  const isMutedRef = useRef<boolean>(isMuted);
  isMutedRef.current = isMuted;

  const lastChimedStageRef = useRef<number>(-1);
  const lastTickedSecondRef = useRef<number>(-1);
  const lastReportedSecondRef = useRef<number>(0);

  // Active stage determination
  let currentStageIndex = 0;
  for (let i = 0; i < recipe.stages.length; i++) {
    const stage = recipe.stages[i];
    if (elapsedSeconds >= stage.startSecond && elapsedSeconds < stage.startSecond + stage.durationSeconds) {
      currentStageIndex = i;
      break;
    }
    if (elapsedSeconds >= stage.startSecond + stage.durationSeconds) {
      currentStageIndex = i;
    }
  }

  const currentStage = recipe.stages[currentStageIndex] || recipe.stages[0];
  const nextStage = recipe.stages[currentStageIndex + 1];

  // Progress metrics
  const totalProgress = recipe.totalTimeSeconds > 0
    ? Math.min(100, (elapsedSeconds / recipe.totalTimeSeconds) * 100)
    : 0;

  const stageElapsed = elapsedSeconds - currentStage.startSecond;
  const stageProgress = currentStage.durationSeconds > 0
    ? Math.min(100, Math.max(0, (stageElapsed / currentStage.durationSeconds) * 100))
    : 0;

  const remainingSeconds = Math.max(0, recipe.totalTimeSeconds - elapsedSeconds);

  // Drift-free delta clock
  useEffect(() => {
    if (!isRunning) return;

    startTimeRef.current = performance.now() - accumulatedMsRef.current;

    const intervalId = setInterval(() => {
      const now = performance.now();
      const elapsedMs = now - startTimeRef.current;
      accumulatedMsRef.current = elapsedMs;

      const currentSec = Math.floor(elapsedMs / 1000);

      if (currentSec !== lastReportedSecondRef.current) {
        lastReportedSecondRef.current = currentSec;
        setElapsedSeconds(currentSec);

        const currentRecipe = recipeRef.current;
        const muted = isMutedRef.current;

        // Stage transition trigger
        for (let idx = 0; idx < currentRecipe.stages.length; idx++) {
          const stage = currentRecipe.stages[idx];
          if (currentSec === stage.startSecond && lastChimedStageRef.current < idx) {
            lastChimedStageRef.current = idx;
            mobileFeedback.triggerHapticStageTransition();
            mobileFeedback.playChime(muted);
            break;
          }
        }

        // 3-2-1 countdown ticks
        const upcomingStage = currentRecipe.stages.find((s) => s.startSecond > currentSec);
        if (upcomingStage) {
          const secondsUntil = upcomingStage.startSecond - currentSec;
          if (secondsUntil <= 3 && secondsUntil > 0 && lastTickedSecondRef.current !== currentSec) {
            lastTickedSecondRef.current = currentSec;
            mobileFeedback.triggerHapticCountdown();
          }
        }

        // Finish detection
        if (currentSec >= currentRecipe.totalTimeSeconds && currentRecipe.totalTimeSeconds > 0) {
          setIsFinished(true);
          setIsRunning(false);
          mobileFeedback.triggerHapticBrewComplete();
          clearInterval(intervalId);
        }
      }
    }, 50);

    return () => clearInterval(intervalId);
  }, [isRunning]);

  const start = useCallback(() => {
    if (isFinished) return;
    mobileFeedback.triggerHapticTap();
    setIsRunning(true);
  }, [isFinished]);

  const pause = useCallback(() => {
    mobileFeedback.triggerHapticTap();
    setIsRunning(false);
  }, []);

  const reset = useCallback(() => {
    mobileFeedback.triggerHapticTap();
    setIsRunning(false);
    setElapsedSeconds(0);
    setIsFinished(false);
    accumulatedMsRef.current = 0;
    lastReportedSecondRef.current = 0;
    lastChimedStageRef.current = -1;
    lastTickedSecondRef.current = -1;
  }, []);

  const toggleTimer = useCallback(() => {
    if (isRunning) {
      pause();
    } else {
      start();
    }
  }, [isRunning, pause, start]);

  const toggleMute = useCallback(() => {
    mobileFeedback.triggerHapticTap();
    setIsMuted((prev) => !prev);
  }, []);

  return {
    elapsedSeconds,
    remainingSeconds,
    isRunning,
    isFinished,
    isMuted,
    currentStageIndex,
    currentStage,
    nextStage,
    totalProgress,
    stageProgress,
    start,
    pause,
    reset,
    toggleTimer,
    toggleMute,
  };
};
```

- [ ] **Step 4: Run unit tests to verify pass**

Run:
```bash
pnpm --filter @brewlog/mobile test
```
Expected: PASS with 3/3 tests passing.

- [ ] **Step 5: Commit Task 2**

```bash
git add apps/mobile/src/hooks/useMobileBrewTimer.ts apps/mobile/src/hooks/useMobileBrewTimer.test.ts
git commit -m "feat(mobile): implement drift-free precision timing hook"
```

---

### Task 3: Method Pills & Collapsible Standalone Calculator

**Files:**
- Create: `apps/mobile/src/components/timer/MethodPills.tsx`
- Create: `apps/mobile/src/components/timer/CollapsibleCalculator.tsx`

**Interfaces:**
- Produces:
  - `MethodPillsProps`: `{ selectedMethod: string; onSelectMethod: (method: string) => void; methods: string[] }`
  - `CollapsibleCalculatorProps`: `{ defaultDose: number; defaultRatio: number }`

- [ ] **Step 1: Implement `MethodPills.tsx`**

Write `apps/mobile/src/components/timer/MethodPills.tsx`:
```tsx
import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { INDUSTRIAL_PRECISION_THEME } from '@brewlog/core';

const { colors } = INDUSTRIAL_PRECISION_THEME;

interface MethodPillsProps {
  selectedMethod: string;
  onSelectMethod: (method: string) => void;
  methods: string[];
}

export const MethodPills: React.FC<MethodPillsProps> = ({
  selectedMethod,
  onSelectMethod,
  methods,
}) => {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {methods.map((method) => {
          const isSelected = selectedMethod.toLowerCase() === method.toLowerCase();
          return (
            <Pressable
              key={method}
              onPress={() => onSelectMethod(method)}
              style={[
                styles.pill,
                isSelected ? styles.pillActive : styles.pillInactive,
              ]}
            >
              <Text
                style={[
                  styles.pillText,
                  isSelected ? styles.pillTextActive : styles.pillTextInactive,
                ]}
              >
                {method.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  pillActive: {
    backgroundColor: colors.surface,
    borderColor: colors.accent,
  },
  pillInactive: {
    backgroundColor: colors.background,
    borderColor: colors.borderSubtle,
  },
  pillText: {
    fontSize: 11,
    fontFamily: 'Courier',
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  pillTextActive: {
    color: colors.accent,
  },
  pillTextInactive: {
    color: colors.textMuted,
  },
});
```

- [ ] **Step 2: Implement `CollapsibleCalculator.tsx` (Default Collapsed)**

Write `apps/mobile/src/components/timer/CollapsibleCalculator.tsx`:
```tsx
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { ChevronDown, ChevronUp, Calculator } from 'lucide-react-native';
import { INDUSTRIAL_PRECISION_THEME, calculateWaterAmount } from '@brewlog/core';

const { colors } = INDUSTRIAL_PRECISION_THEME;

interface CollapsibleCalculatorProps {
  initialDose?: number;
  initialRatio?: number;
}

export const CollapsibleCalculator: React.FC<CollapsibleCalculatorProps> = ({
  initialDose = 18,
  initialRatio = 16,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [dose, setDose] = useState(initialDose.toString());
  const [ratio, setRatio] = useState(initialRatio.toString());

  const doseNum = parseFloat(dose) || 0;
  const ratioNum = parseFloat(ratio) || 0;
  const targetWater = calculateWaterAmount(doseNum, ratioNum);

  return (
    <View style={styles.card}>
      <Pressable
        onPress={() => setIsExpanded((prev) => !prev)}
        style={styles.header}
        accessibilityRole="button"
        accessibilityLabel="Toggle Ratio Calculator"
      >
        <View style={styles.headerLeft}>
          <Calculator size={15} color={colors.accent} />
          <Text style={styles.title}>RATIO CALCULATOR</Text>
          <Text style={styles.summaryBadge}>
            {doseNum}g @ 1:{ratioNum} ➔ {targetWater.toFixed(1)}g
          </Text>
        </View>
        {isExpanded ? (
          <ChevronUp size={16} color={colors.textMuted} />
        ) : (
          <ChevronDown size={16} color={colors.textMuted} />
        )}
      </Pressable>

      {isExpanded && (
        <View style={styles.body}>
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

          <View style={styles.targetRow}>
            <Text style={styles.targetLabel}>TARGET WATER</Text>
            <Text style={styles.targetValue}>{targetWater.toFixed(1)}g</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.borderSubtle,
    borderWidth: 1,
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 6,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: colors.textMuted,
    fontSize: 10,
    fontFamily: 'Courier',
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  summaryBadge: {
    color: colors.text,
    fontSize: 11,
    fontFamily: 'Courier',
    fontWeight: '600',
  },
  body: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    gap: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  inputGroup: {
    flex: 1,
    gap: 4,
  },
  inputLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontFamily: 'Courier',
    fontWeight: '700',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.borderSubtle,
    borderWidth: 1,
    borderRadius: 6,
    color: colors.text,
    fontSize: 15,
    fontFamily: 'Courier',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  targetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.borderSubtle,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  targetLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: 'Courier',
    fontWeight: '700',
    letterSpacing: 1,
  },
  targetValue: {
    color: colors.accent,
    fontSize: 18,
    fontFamily: 'Courier',
    fontWeight: '700',
  },
});
```

- [ ] **Step 3: Verify TypeScript and file hygiene**

Run:
```bash
pnpm --filter @brewlog/mobile typecheck
```
Expected: PASS with 0 errors.

- [ ] **Step 4: Commit Task 3**

```bash
git add apps/mobile/src/components/timer/MethodPills.tsx apps/mobile/src/components/timer/CollapsibleCalculator.tsx
git commit -m "feat(mobile): add method pills and collapsible ratio calculator"
```

---

### Task 4: Web-Parity Instrument Faceplate (`TimerHero`), Active Stage & Timeline

**Files:**
- Create: `apps/mobile/src/components/timer/TimerHero.tsx`
- Create: `apps/mobile/src/components/timer/ActiveStageCard.tsx`
- Create: `apps/mobile/src/components/timer/StageTimeline.tsx`

**Interfaces:**
- Produces:
  - `TimerHeroProps`: `{ recipe: BrewRecipe; elapsedSeconds: number; isRunning: boolean; isMuted: boolean; currentStageTargetWater: number; doseGrams: number; onToggleTimer: () => void; onReset: () => void; onToggleMute: () => void; totalProgress: number }`
  - `ActiveStageCardProps`: `{ stage: BrewStage; stageIndex: number; totalStages: number; elapsedSeconds: number }`
  - `StageTimelineProps`: `{ stages: BrewStage[]; currentStageIndex: number }`

- [ ] **Step 1: Implement `TimerHero.tsx` (Direct Parity with `TimerView.tsx`)**

Write `apps/mobile/src/components/timer/TimerHero.tsx`:
```tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Play, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react-native';
import { INDUSTRIAL_PRECISION_THEME, BrewRecipe } from '@brewlog/core';

const { colors } = INDUSTRIAL_PRECISION_THEME;

interface TimerHeroProps {
  recipe: BrewRecipe;
  elapsedSeconds: number;
  isRunning: boolean;
  isMuted: boolean;
  currentStageTargetWater: number;
  doseGrams: number;
  onToggleTimer: () => void;
  onReset: () => void;
  onToggleMute: () => void;
  totalProgress: number;
}

export const TimerHero: React.FC<TimerHeroProps> = ({
  recipe,
  elapsedSeconds,
  isRunning,
  isMuted,
  currentStageTargetWater,
  doseGrams,
  onToggleTimer,
  onReset,
  onToggleMute,
  totalProgress,
}) => {
  const mins = Math.floor(elapsedSeconds / 60);
  const secs = elapsedSeconds % 60;
  const timeFormatted = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

  return (
    <View style={styles.chassis}>
      {/* Recipe Title & Specs Header */}
      <View style={styles.recipeHeader}>
        <View>
          <Text style={styles.recipeSubtitle}>{recipe.brewMethod.toUpperCase()} · 1:{recipe.ratio}</Text>
          <Text style={styles.recipeTitle}>{recipe.name}</Text>
        </View>
        <Pressable
          onPress={onToggleMute}
          style={styles.hardwareIconButton}
          accessibilityLabel={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? (
            <VolumeX size={16} color={colors.textMuted} />
          ) : (
            <Volume2 size={16} color={colors.accent} />
          )}
        </Pressable>
      </View>

      {/* Linear Progress Line */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${totalProgress}%` }]} />
      </View>

      {/* Oversized Tabular Digital Clock */}
      <View style={styles.clockContainer}>
        <Text style={styles.clockText}>{timeFormatted}</Text>
      </View>

      {/* Hairline Divider */}
      <View style={styles.hairline} />

      {/* 3-Column Chassis Metrics Grid */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>COFFEE DOSE</Text>
          <Text style={styles.metricValue}>{doseGrams}g</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>WATER TARGET</Text>
          <Text style={styles.metricValue}>{recipe.waterAmountGrams}g</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>POUR TO</Text>
          <Text style={[styles.metricValue, styles.metricValueAccent]}>
            {currentStageTargetWater}g
          </Text>
        </View>
      </View>

      {/* Hairline Divider */}
      <View style={styles.hairline} />

      {/* Controls Row */}
      <View style={styles.controlsRow}>
        <Pressable
          onPress={onToggleTimer}
          style={[
            styles.primaryButton,
            isRunning ? styles.primaryButtonRunning : styles.primaryButtonIdle,
          ]}
        >
          {isRunning ? (
            <>
              <Pause size={16} color="#09090B" fill="#09090B" />
              <Text style={styles.primaryButtonText}>PAUSE</Text>
            </>
          ) : (
            <>
              <Play size={16} color="#09090B" fill="#09090B" />
              <Text style={styles.primaryButtonText}>
                {elapsedSeconds > 0 ? 'RESUME' : 'START BREW'}
              </Text>
            </>
          )}
        </Pressable>

        <Pressable
          onPress={onReset}
          style={styles.hardwareIconButton}
          accessibilityLabel="Reset Timer"
        >
          <RotateCcw size={16} color={colors.textMuted} />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  chassis: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 14,
  },
  recipeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  recipeSubtitle: {
    color: colors.accent,
    fontSize: 10,
    fontFamily: 'Courier',
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  recipeTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 2,
  },
  progressTrack: {
    height: 3,
    backgroundColor: colors.surface,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
  },
  clockContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  clockText: {
    fontSize: 72,
    fontFamily: 'Courier',
    fontWeight: '300',
    color: colors.text,
    letterSpacing: -2,
  },
  hairline: {
    height: 1,
    backgroundColor: colors.borderSubtle,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricItem: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 9,
    fontFamily: 'Courier',
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1.2,
  },
  metricValue: {
    fontSize: 22,
    fontFamily: 'Courier',
    fontWeight: '300',
    color: colors.text,
    marginTop: 2,
  },
  metricValueAccent: {
    color: colors.accent,
    fontWeight: '600',
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 6,
    gap: 8,
  },
  primaryButtonIdle: {
    backgroundColor: colors.text,
  },
  primaryButtonRunning: {
    backgroundColor: colors.accent,
  },
  primaryButtonText: {
    color: '#09090B',
    fontSize: 12,
    fontFamily: 'Courier',
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  hardwareIconButton: {
    width: 48,
    height: 48,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```

- [ ] **Step 2: Implement `ActiveStageCard.tsx`**

Write `apps/mobile/src/components/timer/ActiveStageCard.tsx`:
```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { INDUSTRIAL_PRECISION_THEME, BrewStage } from '@brewlog/core';

const { colors } = INDUSTRIAL_PRECISION_THEME;

interface ActiveStageCardProps {
  stage: BrewStage;
  stageIndex: number;
  totalStages: number;
  elapsedSeconds: number;
}

export const ActiveStageCard: React.FC<ActiveStageCardProps> = ({
  stage,
  stageIndex,
  totalStages,
  elapsedSeconds,
}) => {
  const stageEndSecond = stage.startSecond + stage.durationSeconds;
  const secondsLeftInStage = Math.max(0, stageEndSecond - elapsedSeconds);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.stepBadge}>
          STAGE {stageIndex + 1} OF {totalStages}
        </Text>
        <Text style={styles.countdownText}>
          {secondsLeftInStage}S REMAINING
        </Text>
      </View>

      <Text style={styles.stageName}>{stage.name}</Text>
      
      <View style={styles.targetRow}>
        <Text style={styles.targetWaterLabel}>POUR TARGET</Text>
        <Text style={styles.targetWaterValue}>{stage.targetWaterWeightGrams}g</Text>
      </View>

      {stage.description ? (
        <Text style={styles.description}>{stage.description}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    backgroundColor: colors.surface,
    borderColor: colors.accent,
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepBadge: {
    color: colors.accent,
    fontSize: 10,
    fontFamily: 'Courier',
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  countdownText: {
    color: colors.textMuted,
    fontSize: 10,
    fontFamily: 'Courier',
    fontWeight: '700',
    letterSpacing: 1,
  },
  stageName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  targetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 4,
  },
  targetWaterLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontFamily: 'Courier',
    fontWeight: '700',
    letterSpacing: 1,
  },
  targetWaterValue: {
    color: colors.accent,
    fontSize: 18,
    fontFamily: 'Courier',
    fontWeight: '700',
  },
  description: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
});
```

- [ ] **Step 3: Implement `StageTimeline.tsx`**

Write `apps/mobile/src/components/timer/StageTimeline.tsx`:
```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CheckCircle2, CircleDot, Circle } from 'lucide-react-native';
import { INDUSTRIAL_PRECISION_THEME, BrewStage } from '@brewlog/core';

const { colors } = INDUSTRIAL_PRECISION_THEME;

interface StageTimelineProps {
  stages: BrewStage[];
  currentStageIndex: number;
}

export const StageTimeline: React.FC<StageTimelineProps> = ({
  stages,
  currentStageIndex,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>BREW TIMELINE</Text>
      <View style={styles.timelineList}>
        {stages.map((stage, idx) => {
          const isDone = idx < currentStageIndex;
          const isActive = idx === currentStageIndex;

          const startMin = Math.floor(stage.startSecond / 60);
          const startSec = stage.startSecond % 60;
          const timeLabel = `${startMin}:${startSec < 10 ? '0' : ''}${startSec}`;

          return (
            <View key={stage.id || idx} style={styles.stepRow}>
              <View style={styles.stepIcon}>
                {isDone ? (
                  <CheckCircle2 size={14} color={colors.textMuted} />
                ) : isActive ? (
                  <CircleDot size={14} color={colors.accent} />
                ) : (
                  <Circle size={14} color={colors.borderSubtle} />
                )}
              </View>
              <View style={styles.stepInfo}>
                <Text
                  style={[
                    styles.stepName,
                    isActive && styles.stepNameActive,
                    isDone && styles.stepNameDone,
                  ]}
                >
                  {stage.name}
                </Text>
                <Text style={styles.stepMeta}>
                  {timeLabel} · {stage.targetWaterWeightGrams}g
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  title: {
    color: colors.textMuted,
    fontSize: 10,
    fontFamily: 'Courier',
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  timelineList: {
    gap: 10,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepIcon: {
    width: 18,
    alignItems: 'center',
  },
  stepInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepName: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  stepNameActive: {
    color: colors.accent,
    fontWeight: '700',
  },
  stepNameDone: {
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  stepMeta: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: 'Courier',
  },
});
```

- [ ] **Step 4: Verify TypeScript compilation**

Run:
```bash
pnpm --filter @brewlog/mobile typecheck
```
Expected: PASS with 0 errors.

- [ ] **Step 5: Commit Task 4**

```bash
git add apps/mobile/src/components/timer/TimerHero.tsx apps/mobile/src/components/timer/ActiveStageCard.tsx apps/mobile/src/components/timer/StageTimeline.tsx
git commit -m "feat(mobile): add TimerHero, ActiveStageCard, and StageTimeline components"
```

---

### Task 5: Integrate Timer Screen & Monorepo Validation

**Files:**
- Modify: `apps/mobile/app/(tabs)/index.tsx`

**Interfaces:**
- Assembles: `MethodPills`, `CollapsibleCalculator`, `TimerHero`, `ActiveStageCard`, `StageTimeline`, `useMobileBrewTimer`.

- [ ] **Step 1: Update `apps/mobile/app/(tabs)/index.tsx`**

Replace placeholder smoke elements with the live interactive timer view:
```tsx
import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import {
  INDUSTRIAL_PRECISION_THEME,
  DEFAULT_PRESET_RECIPES,
  BrewRecipe,
  rescaleRecipeDose,
} from '@brewlog/core';
import { useMobileBrewTimer } from '../../src/hooks/useMobileBrewTimer';
import { MethodPills } from '../../src/components/timer/MethodPills';
import { CollapsibleCalculator } from '../../src/components/timer/CollapsibleCalculator';
import { TimerHero } from '../../src/components/timer/TimerHero';
import { ActiveStageCard } from '../../src/components/timer/ActiveStageCard';
import { StageTimeline } from '../../src/components/timer/StageTimeline';

const { colors } = INDUSTRIAL_PRECISION_THEME;

const AVAILABLE_METHODS = ['V60', 'Chemex', 'Aeropress', 'French Press'];

export default function TimerScreen() {
  const router = useRouter();
  const [selectedRecipe, setSelectedRecipe] = useState<BrewRecipe>(DEFAULT_PRESET_RECIPES[0]);
  const [doseGrams, setDoseGrams] = useState(DEFAULT_PRESET_RECIPES[0].coffeeDoseGrams);

  const activeRecipe = rescaleRecipeDose(selectedRecipe, doseGrams);

  const {
    elapsedSeconds,
    isRunning,
    isFinished,
    isMuted,
    currentStageIndex,
    currentStage,
    totalProgress,
    toggleTimer,
    reset,
    toggleMute,
  } = useMobileBrewTimer(activeRecipe);

  const handleSelectMethod = (methodName: string) => {
    const match = DEFAULT_PRESET_RECIPES.find(
      (r) => r.brewMethod.toLowerCase() === methodName.toLowerCase()
    );
    if (match) {
      reset();
      setSelectedRecipe(match);
      setDoseGrams(match.coffeeDoseGrams);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Quick-Start Method Pills */}
      <MethodPills
        selectedMethod={activeRecipe.brewMethod}
        onSelectMethod={handleSelectMethod}
        methods={AVAILABLE_METHODS}
      />

      {/* Standalone Collapsible Calculator (Default Collapsed) */}
      <CollapsibleCalculator
        initialDose={doseGrams}
        initialRatio={activeRecipe.ratio}
      />

      {/* Web-Parity Instrument Faceplate */}
      <TimerHero
        recipe={activeRecipe}
        elapsedSeconds={elapsedSeconds}
        isRunning={isRunning}
        isMuted={isMuted}
        currentStageTargetWater={currentStage.targetWaterWeightGrams}
        doseGrams={doseGrams}
        onToggleTimer={toggleTimer}
        onReset={reset}
        onToggleMute={toggleMute}
        totalProgress={totalProgress}
      />

      {/* Finished Banner */}
      {isFinished ? (
        <View style={styles.finishedBanner}>
          <Text style={styles.finishedTitle}>BREW COMPLETE</Text>
          <Text style={styles.finishedSubtitle}>
            Completed in {Math.floor(elapsedSeconds / 60)}m {elapsedSeconds % 60}s
          </Text>
          <Pressable
            onPress={() => router.push('/cupping')}
            style={styles.logButton}
          >
            <Text style={styles.logButtonText}>LOG TO CUPPING JOURNAL</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {/* Active Pour Guidance */}
          <ActiveStageCard
            stage={currentStage}
            stageIndex={currentStageIndex}
            totalStages={activeRecipe.stages.length}
            elapsedSeconds={elapsedSeconds}
          />

          {/* Timeline of Stages */}
          <StageTimeline
            stages={activeRecipe.stages}
            currentStageIndex={currentStageIndex}
          />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    paddingBottom: 32,
  },
  finishedBanner: {
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: colors.surface,
    borderColor: colors.accent,
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  finishedTitle: {
    color: colors.accent,
    fontSize: 14,
    fontFamily: 'Courier',
    fontWeight: '800',
    letterSpacing: 2,
  },
  finishedSubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  logButton: {
    marginTop: 8,
    backgroundColor: colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  logButtonText: {
    color: '#09090B',
    fontSize: 11,
    fontFamily: 'Courier',
    fontWeight: '800',
    letterSpacing: 1.2,
  },
});
```

- [ ] **Step 2: Run full monorepo typecheck, tests, and Metro export**

Run:
```bash
pnpm -r typecheck
pnpm test
cd apps/mobile && npx expo export --platform ios && npx expo export --platform android
```
Expected: PASS across all commands with 0 errors.

- [ ] **Step 3: Commit Task 5**

```bash
git add apps/mobile/app/\(tabs\)/index.tsx
git commit -m "feat(mobile): integrate interactive brew timer into primary tab route"
```

---

### Task 6: Visual Verification & Documentation

**Files:**
- Modify: `docs/ROADMAP.md`
- Create: `docs/devlogs/2026-09-19-mobile-interactive-timer.md`
- Update: `walkthrough.md`

- [ ] **Step 1: Simulator Verification on iPhone 18 Pro**

1. Capture screenshot of collapsed calculator and method pills.
2. Tap Play button to start timer, let it run 3 seconds, verify large digital clock counts up.
3. Capture screenshot of running timer and active stage hero card.
4. Verify Reset returns clock to 00:00.

- [ ] **Step 2: Update Roadmap and Devlog**

Record completion of mobile interactive timer in `docs/ROADMAP.md` and create `docs/devlogs/2026-09-19-mobile-interactive-timer.md`.

- [ ] **Step 3: Commit Task 6**

```bash
git add docs/ROADMAP.md docs/devlogs/2026-09-19-mobile-interactive-timer.md
git commit -m "docs: document mobile interactive brew timer implementation"
```
