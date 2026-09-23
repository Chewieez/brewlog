# ADR 005: Offline-First Coffee Stash Management and Biochemical Resting Engine

## Status
Accepted

## Context
Specialty coffee beans are perishable organic agricultural products that undergo continuous physical and chemical evolution following the roasting process:
1. **$CO_2$ Degassing & Resting Windows**: Freshly roasted whole-bean coffee releases large volumes of carbon dioxide ($CO_2$). Brewing too early (days 1–5) causes excessive turbulence, uneven channel extraction, and harsh acidity. Beans typically require an off-gassing rest period (7–21 days depending on roast profile and density) to reach peak flavor clarity, after which aromatic volatile compounds gradually oxidize over subsequent weeks.
2. **Deep-Freeze Vault Preservation**: Specialty coffee enthusiasts and competitive baristas frequently freeze coffee bags at $-18^\circ\text{C}$ to $-20^\circ\text{C}$ in airtight packaging. Freezing halts cellular and volatile oxidation, effectively freezing the coffee's biochemical aging clock for months or years.
3. **Intermittent Connectivity & Mobile Context**: Baristas frequently operate in locations with poor or nonexistent network access—such as basement cellars, pop-up coffee bars, roasteries, or outdoor camps. An inventory management system that blocks on network roundtrips or requires continuous connectivity produces unacceptable latency and data entry friction.
4. **Integration with Brew Timing**: Managing bean inventory in isolation from the brew timer creates manual tracking fatigue. Users must manually calculate and subtract 15g–30g doses from bag totals after every brew.

## Decision

We adopted an **Offline-First Inventory Architecture with a Pure Biochemical Resting Engine**:

### 1. Extended Domain Model & Database Schema Contract
We expanded the core `Bean` model in `@brewlog/core` and Supabase PostgreSQL schema (`003_add_bean_cellar_status.sql`):
- `recommendedRestDays`: Optional integer denoting the roaster's recommended resting window prior to first brew.
- `isFrozen`: Boolean flag indicating active storage in a freezer vault.
- `frozenDate`: ISO 8601 string timestamp recording when the bag was placed into the freezer.
- `isArchived`: Boolean flag moving finished or retired bags out of active cellar views.
- `remainingGrams`: Explicit numeric mass remaining in the bag. Database mappers strictly evaluate `remaining_grams !== null && remaining_grams !== undefined` to ensure zero-gram empty bags (`remainingGrams: 0`) are accurately preserved without falsely reverting to original bag weight.

### 2. Pure Resting Engine & Freezer Pause Math (`apps/mobile/src/features/stash/utils/restingUtils.ts`)
To ensure platform independence and deterministic behavior across web and mobile:
- **Freezer Preservation Math**: When `isFrozen = true` and `frozenDate` is defined, the effective age of the coffee is frozen at the duration between roast date and freeze date:
  $$\text{effectiveDays} = \max\left(0, \left\lfloor \frac{\text{frozenDate} - \text{roastDate}}{86400000} \right\rfloor\right)$$
  When unfreezing, age accrues forward starting from the accumulated pre-freeze days.
- **Adaptive Resting Curves**: Rather than enforcing rigid global cutoffs, resting curves dynamically adjust to roaster guidance:
  - $\text{restDays} = \text{recommendedRestDays} \mathbin{??} 7$
  - $\text{peakDays} = \text{restDays} + 14$
  - $\text{agingDays} = \text{peakDays} + 14$
- **Semantic Freshness Status**: Evaluates effective days into five stages: `Frozen`, `Needs Rest`, `Peak`, `Aging`, and `Past Peak`.
- **Timezone-Safe Date Math**: Uses UTC date normalization to prevent date boundary jitter across daylight saving transitions and local timezones.

### 3. Offline-First State Management (`StashContext.tsx`)
- **Zero-Latency Startup**: Bags hydrate synchronously on app launch from `@react-native-async-storage/async-storage` (`@brewlog/mobile:stash_cache`), eliminating loading spinners on cold start.
- **Shelf Partitioning**: Memory-efficient `useMemo` derivations categorize the cellar into three distinct views:
  - `activeBeans`: `!isFrozen && !isArchived`
  - `frozenBeans`: `isFrozen && !isArchived`
  - `archivedBeans`: `isArchived`
- **Optimistic Local Mutations**: State updates and `AsyncStorage` writes occur immediately on user interaction. Supabase cloud sync operations execute in the background with automatic reconciliation, preserving locally authored offline entries.

### 4. Direct Timer Bridge & 1-Tap Dose Deduction
- **Active Brew Bean**: `StashContext` exposes `activeBrewBean` and `setActiveBrewBean`, allowing baristas to select a bean directly from `BeanDetailScreen`.
- **Instrument Faceplate Integration**: An `ActiveBeanPill` renders atop the `TimerHero` on the timer tab, displaying roaster, name, and remaining mass with an Apple HIG $\ge 44$pt detach button.
- **Single-Tap Post-Brew Deduction**: When a brew finishes, `TimerScreen` renders a 1-tap card (`"DEDUCT [dose]g FROM STASH"`). Tapping deducts the active brew dose via `deductBeanDose(beanId, dose)` with optimistic UI feedback and prevents accidental double-deduction.

### 5. Native Modal Ergonomics & Cross-Platform Safe Area Spacing
- **Android Modal Status Bar Insets**: To prevent header controls from clipping beneath the camera punch-hole and status bar on Android edge-to-edge modals (`presentation: 'modal'`), modal screens wrap their headers in `<SafeAreaView edges={['top']}>` from `react-native-safe-area-context`.
- **Permissive Date Input Normalization**: `normalizeRoastDate()` automatically parses American date formats (`MM-DD-YYYY`, `MM/DD/YYYY`) and ISO dates (`YYYY-MM-DD`), converting them into valid ISO strings upon saving.

## Consequences

### Positive
- **Instantaneous UI Interactions**: Cellar browsing, bag creation, and shelf switching respond with zero network latency.
- **Scientifically Grounded Freshness Tracking**: Eliminates guesswork regarding bean maturity and honors custom roaster recommendations.
- **Accurate Freezer Modeling**: Correctly reflects that frozen beans retain freshness rather than falsely appearing "Past Peak".
- **Seamless Brew-to-Inventory Feedback**: Automates bean consumption tracking without requiring manual weight recalculations.

### Trade-offs & Limitations
- **Client Clock Dependency**: Age calculations rely on the client device's system clock. Extreme clock skew on the device may temporarily shift calculated days off roast until the clock resynchronizes.
- **Single Freeze/Thaw State**: Current schema models `isFrozen` and `frozenDate` as binary states. Multiple freeze-thaw-refreeze cycles are collapsed into the current freeze duration; full cycle event logging is deferred to a future enhancement.
