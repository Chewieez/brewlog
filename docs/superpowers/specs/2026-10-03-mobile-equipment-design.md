# Mobile Equipment Page & Web Parity Design Spec

## 1. Overview & Objectives

This specification details the end-to-end design and implementation of the **Equipment Subsystem** on mobile (`apps/mobile`), while updating web (`apps/web`) to ensure 100% visual and functional parity.

Mobile currently renders a static placeholder in `app/(tabs)/equipment.tsx`. Web has an `EquipmentView` that supports adding and deleting equipment, but lacks search filtering, category chips, inline editing, and favorite starring that are standard across Bean Stash and Recipe Studio.

### Key Goals
1. **Mobile Equipment Catalog (`app/(tabs)/equipment.tsx`)**: Replace the placeholder with an interactive equipment catalog featuring a search bar, category filter chips (`All`, `Grinders`, `Brewers`, `Scales`, `Kettles`), grouped category sections matching Web (`Sliders`, `Coffee`, `Scale`, `Flame` icons), item counts, and category-level empty states.
2. **Standardized Industrial Precision Wording**: Clean, uncluttered titles and copy aligning with Web. Avoid terms like "Hardware" or "Locker", and omit unnecessary eyebrow text above the title.
3. **Native Add/Edit Modal (`app/equipment/modal.tsx`)**: Full CRUD modal supporting both creation and editing, dirty-checking with discard confirmation alerts, and a destructive delete action in edit mode.
4. **Modern Mobile Keyboard & Scroll Setup**: Utilize the exact scrolling architecture established in `BeanModalScreen` and `RecipeBuilderScreen` using `KeyboardAwareScrollView` from `react-native-keyboard-controller` with `bottomOffset={32}`, `keyboardShouldPersistTaps="handled"`, and safe unmount cleanup.
5. **Offline-First Resilience & Cloud Sync (`EquipmentContext.tsx`)**: Dedicated React context backed by `AsyncStorage` (`@brewlog/mobile:equipment_cache`) that seeds `DEFAULT_INITIAL_EQUIPMENT` for new/guest users, supports optimistic updates, and synchronizes with Supabase's `equipment` table upon authentication.
6. **Web Parity Updates (`EquipmentView.tsx` & `useEquipment.ts`)**: Add real-time search, category filter chips, card editing modal flows, and favorite star toggling to web, aligning with `StashView.tsx` and `RecipeCatalogList.tsx`.

---

## 2. Architecture & Data Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                              RootLayout                                │
│   (AuthProvider -> RecipeProvider -> StashProvider -> EquipmentProvider)│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
       ┌─────────────────────────┐     ┌─────────────────────────┐
       │      AsyncStorage       │     │     Supabase Client     │
       │  @brewlog/mobile:       │     │   Table: "equipment"    │
       │  equipment_cache        │     │  (mappers from          │
       │  equipment_pending_sync │     │   @brewlog/supabase)    │
       └────────────┬────────────┘     └────────────┬────────────┘
                    │                               │
                    └───────────────┬───────────────┘
                                    ▼
                     ┌─────────────────────────────┐
                     │      EquipmentContext       │
                     │  - equipment / by category  │
                     │  - addEquipment             │
                     │  - updateEquipment          │
                     │  - deleteEquipment          │
                     │  - toggleFavorite           │
                     └──────────────┬──────────────┘
                                    │
            ┌───────────────────────┴───────────────────────┐
            ▼                                               ▼
┌───────────────────────────────┐               ┌───────────────────────────────┐
│    EquipmentCatalogScreen     │               │      EquipmentModalScreen     │
│   (app/(tabs)/equipment.tsx)  │──────────────▶│   (app/equipment/modal.tsx)   │
│  - Search & Category chips    │  Tap to Edit  │  - Add / Edit form            │
│  - Grouped Section cards      │  or Add CTA   │  - KeyboardAwareScrollView    │
│  - Star favorite toggles      │               │  - Discard & Delete guards    │
└───────────────────────────────┘               └───────────────────────────────┘
```

### 2.1 Core Starter Gear (`@brewlog/core`)

In `packages/core/src/presets.ts`:
- Export `DEFAULT_INITIAL_EQUIPMENT: Equipment[]` containing the 7 canonical starter items:
  1. `eq-1`: Fellow Ode Gen 2 (Grinder, Flat burr, Stepped numbers, Favorite)
  2. `eq-2`: Comandante C40 MK4 (Grinder, Conical burr, Clicks, Favorite)
  3. `eq-3`: Hario V60 02 Plastic (Brewer, Pour-over, Favorite)
  4. `eq-4`: AeroPress Clear (Brewer, Immersion, Favorite)
  5. `eq-5`: Flair 58+ (Brewer, Lever espresso, Favorite)
  6. `eq-6`: Timemore Black Mirror Basic 2 (Scale, Smart scale, Favorite)
  7. `eq-7`: Fellow Stagg EKG (Kettle, Gooseneck electric, Favorite)
- Re-export `DEFAULT_INITIAL_EQUIPMENT` from `packages/core/src/index.ts`.
- Update web's `sampleData.ts` and mobile's initialization to reference this single source of truth.

### 2.2 Mobile State Management (`EquipmentContext.tsx`)

File: `apps/mobile/src/features/equipment/EquipmentContext.tsx`

```typescript
export interface EquipmentContextValue {
  equipment: Equipment[];
  grinders: Equipment[];
  brewers: Equipment[];
  scales: Equipment[];
  kettles: Equipment[];
  loading: boolean;
  addEquipment: (item: Omit<Equipment, 'id' | 'createdAt'>) => Promise<Equipment>;
  updateEquipment: (id: string, updates: Partial<Equipment>) => Promise<Equipment>;
  deleteEquipment: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  refreshEquipment: () => Promise<void>;
}
```

- **Persistence Keys**:
  - `@brewlog/mobile:equipment_cache`: stores cached `Equipment[]`.
  - `@brewlog/mobile:equipment_pending_updates`: stores IDs of items edited while offline.
  - `@brewlog/mobile:equipment_pending_deletes`: stores IDs of items deleted while offline.
- **Initial Load**:
  - Checks `AsyncStorage`. If null or empty array for a guest user, seeds with `DEFAULT_INITIAL_EQUIPMENT`.
- **Sync Flow**:
  - When `user` is authenticated via `useAuth()`:
    1. Flushes unsynced offline items (`local-eq-*` prefix) and pending updates/deletes to Supabase `equipment` table.
    2. Queries Supabase `equipment` ordered by `created_at desc`.
    3. Maps rows using `mapEquipmentRowToDomain` from `@brewlog/supabase`.
    4. Sets state and updates `AsyncStorage`.
- **Root Layout Integration**:
  - In `apps/mobile/app/_layout.tsx`, nest `<EquipmentProvider>` within `<StashProvider>`.

---

## 3. Mobile UI & Screens

### 3.1 Equipment Catalog Screen (`apps/mobile/src/features/equipment/screens/EquipmentCatalogScreen.tsx`)

Rendered by `apps/mobile/app/(tabs)/equipment.tsx`:

- **Header Component**:
  - Title: `Equipment` (`fonts.sansBold`, 22px, `colors.textPrimary`).
  - Subtitle: `Manage your grinders, brewers, scales, and kettles.` (`colors.textSecondary`, 13px).
  - Top Action Button: `+ ADD EQUIPMENT` (`colors.accent` background, dark text, minimum 44px touch target) navigating to `/equipment/modal`.
  - *No eyebrow text above the title.*
- **Search Bar**:
  - `Search` icon on left, text input, clear (`X`) button on right.
  - Filters across `brand`, `model`, `subType`, and `notes`.
- **Category Filter Chips**:
  - Horizontal selector: `All`, `Grinders`, `Brewers`, `Scales`, `Kettles`.
  - Active chip uses `colors.panelRecessed` with `colors.accent` border and text.
- **Grouped Category Sections (when `All` is selected)**:
  - **Grinders ({count})**: Header with `Sliders` icon.
  - **Brewers & Drippers ({count})**: Header with `Coffee` icon.
  - **Precision Scales ({count})**: Header with `Scale` icon.
  - **Kettles & Water Gear ({count})**: Header with `Flame` icon.
  - Empty state per category: dashed border panel with subtle text (e.g., "No grinders logged yet").
- **Single Category View (when specific chip is active)**:
  - Displays only the cards belonging to that category with direct item separation.
- **Global Empty State**:
  - Rendered when search yields no matches or all gear is removed, prompting to clear search or add gear.

### 3.2 Equipment Card Component (`apps/mobile/src/features/equipment/components/EquipmentCard.tsx`)

- **Container**: `colors.panel`, `colors.borderSubtle`, 1px border, 8px radius.
- **Header Row**:
  - Brand name: `fonts.monoBold`, 11px, `colors.accent`, uppercase.
  - Right cluster:
    - `settingScaleType` pill (e.g. `stepped-numbers`, `clicks`, `stepless`).
    - `subType` pill (e.g. `flat-burr`, `pour-over`, `0.1g smart`).
    - Interactive **Star** button (`Lucide.Star`, 18px): amber filled when `isFavorite: true`, muted outline when false. Tapping triggers `onToggleFavorite` with `e.stopPropagation()` so the edit modal is not opened.
- **Body**:
  - Model name: `fonts.sansBold`, 16px, `colors.textPrimary`.
  - Notes: `fonts.sansRegular`, 12px, `colors.textSecondary`, 2-line max ellipsis.
- **Press Handler**:
  - Tapping card navigates to `/equipment/modal?id={item.id}`.

### 3.3 Add/Edit Modal Screen (`apps/mobile/src/features/equipment/screens/EquipmentModalScreen.tsx`)

Rendered by `apps/mobile/app/equipment/modal.tsx`, registered in `apps/mobile/app/_layout.tsx` as a modal stack screen (`presentation: 'modal', headerShown: false`).

- **Scroll & Keyboard Architecture**:
  - Wrapped in `<SafeAreaView style={styles.safeArea} edges={['top']}>`.
  - Uses `<KeyboardAwareScrollView>` from `react-native-keyboard-controller`:
    - `bottomOffset={32}`
    - `keyboardShouldPersistTaps="handled"`
    - Safe ref handling and timeout cleanup on unmount.
- **Navigation Bar**:
  - Left: `X` button.
    - If dirty: displays native alert `"Discard Changes?"` (`Keep Editing` / `Discard`).
    - If clean: calls `router.back()`.
  - Center: `NEW EQUIPMENT` or `EDIT EQUIPMENT` in mono bold uppercase.
  - Right: `Check` save icon button.
- **Form Fields**:
  1. **Category Selector**: Segmented pill choices for `Grinder`, `Brewer`, `Scale`, `Kettle`.
  2. **Brand Name**: Required text input (e.g. "Fellow", "Hario", "Comandante").
  3. **Model Name**: Required text input (e.g. "Ode Gen 2", "V60 02 Plastic").
  4. **Subtype / Mechanism**: Optional text input with dynamic label and placeholder:
     - Grinder: `Burr / Mechanism Type` (e.g. `64mm Flat Burrs`)
     - Brewer: `Brewing Method / Category` (e.g. `Pour-Over`, `Immersion`)
     - Scale: `Features / Resolution` (e.g. `0.1g Smart Scale`)
     - Kettle: `Kettle Features / Spout` (e.g. `Variable Temp Gooseneck`)
  5. **Dial Setting Format** (grinders only):
     - Segmented choices: `Stepped Numbers`, `Clicks`, `Stepless`.
  6. **Favorite Toggle**:
     - Switch / button row to mark as favorite piece of gear.
  7. **Notes**:
     - Multiline text input for calibration tips, recipes, or burr upgrades.
- **Delete Action (Edit Mode)**:
  - Destructive red outlined button at the bottom: `DELETE EQUIPMENT`.
  - Prompts with native confirmation alert: `"Delete Equipment? This will remove this item from your equipment."`
  - On confirm: calls `deleteEquipment(id)` and returns to catalog.

---

## 4. Web Parity Updates (`apps/web`)

### 4.1 State Management (`apps/web/src/features/equipment/useEquipment.ts`)
- Add `updateEquipment: (id: string, updates: Partial<Equipment>) => Promise<Equipment>`:
  - Optimistic local update, saves to `localStorage` (`brewlog_equipment_cache`).
  - Calls Supabase `equipment` update query when authenticated.
- Add `toggleFavorite: (id: string) => Promise<void>`.
- Use `DEFAULT_INITIAL_EQUIPMENT` from `@brewlog/core`.

### 4.2 Web View Component (`apps/web/src/features/equipment/EquipmentView.tsx`)
- **Header**: Maintain existing clean header.
- **Search Bar**: Add search input bar below header matching `StashView.tsx`.
- **Category Filter Chips**: Add `All`, `Grinders`, `Brewers`, `Scales`, `Kettles` filter bar.
- **Card Updates**:
  - Add interactive `Star` icon on each card for 1-click favorite toggling.
  - Add `Pencil` edit button (and clickable card) to open modal in edit mode.
- **Add/Edit Modal**:
  - Pre-populate form with existing equipment when editing.
  - Include "Mark as Favorite" toggle.
  - In edit mode, provide a `DELETE` button with confirmation modal.

---

## 5. Testing & Verification Plan

### 5.1 Unit & Integration Tests

1. **`packages/core`**:
   - `presets.test.ts`: Verify `DEFAULT_INITIAL_EQUIPMENT` exports 7 valid equipment items matching domain schema.
2. **`apps/mobile`**:
   - `EquipmentContext.test.tsx`:
     - Initializes with `DEFAULT_INITIAL_EQUIPMENT` when cache is empty.
     - Adds new equipment to state and `AsyncStorage`.
     - Updates existing equipment and toggles favorite status.
     - Deletes equipment and purges from cache.
     - Synchronizes offline pending items to Supabase when authenticated.
   - `EquipmentCatalogScreen.test.tsx`:
     - Renders category sections (Grinders, Brewers, Scales, Kettles) with item counts.
     - Filters cards when search query is entered.
     - Filters by category when a category chip is tapped.
     - Navigates to `/equipment/modal` on Add button tap and card tap.
   - `EquipmentCard.test.tsx`:
     - Displays brand, model, subtype, and scale type badges.
     - Toggles star favorite without triggering parent card click.
   - `EquipmentModalScreen.test.tsx`:
     - Renders empty form in Add mode and pre-populated form in Edit mode.
     - Validates required brand and model before saving.
     - Confirms discard changes alert when dirty.
     - Tests delete confirmation alert and triggers `deleteEquipment`.
     - Validates `KeyboardAwareScrollView` with mocked `scrollToEnd` / `scrollTo`.
3. **`apps/web`**:
   - `useEquipment.test.ts`: Tests `addEquipment`, `updateEquipment`, `deleteEquipment`, and `toggleFavorite`.
   - `EquipmentView.test.tsx`: Tests search filtering, category chips, card edit modal opening, and favorite toggling.

---

## 6. Implementation Stages & Verification Gates

1. **Stage 1 — Core Presets**: Update `@brewlog/core` with `DEFAULT_INITIAL_EQUIPMENT` and tests.
2. **Stage 2 — Mobile State Layer**: Implement `EquipmentContext.tsx` with offline storage, Supabase sync, and tests. Register in `app/_layout.tsx`.
3. **Stage 3 — Mobile UI**:
   - Create `EquipmentCard.tsx` with tests.
   - Create `EquipmentCatalogScreen.tsx` and wire into `app/(tabs)/equipment.tsx` with tests.
   - Create `EquipmentModalScreen.tsx` with `KeyboardAwareScrollView` and wire into `app/equipment/modal.tsx` with tests.
4. **Stage 4 — Web Parity**: Update `useEquipment.ts` and `EquipmentView.tsx` with search, chips, edit mode, and favorites, with tests.
5. **Stage 5 — End-to-End Verification**: Run mobile and web test suites, verify TypeScript compile across the monorepo.
