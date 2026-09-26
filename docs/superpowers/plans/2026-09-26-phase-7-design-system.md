# Phase 7: Centralized Cross-Platform Design System (`@brewlog/ui`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish `@brewlog/ui` as a shared monorepo workspace package providing cross-platform layout and interaction primitives (`Button`, `Card`, `Badge`, `Input`, `MetricTile`) with platform-split implementations (`.web.tsx` with Tailwind CSS v4 and `.native.tsx` with React Native StyleSheet), strictly enforcing typography standards (purging `JetBrains Mono` from numeric values/inputs/metrics into `Outfit` tabular numerals).

**Architecture:** Single monorepo package at `packages/ui` exporting unified TypeScript contracts (`.types.ts`). Dual entry points via `package.json` conditional exports (`"react-native": "./src/index.native.ts"`, `"default": "./src/index.web.ts"`). Web compiles to semantic HTML using Tailwind v4 CSS variables; Mobile compiles to React Native primitives using `@brewlog/core` theme tokens and loaded Outfit/JetBrains fonts.

**Tech Stack:** React 19, TypeScript 5.7+, Tailwind CSS v4, React Native 0.86 / Expo SDK 57, Vitest, `@testing-library/react`.

**Spec:** [`docs/superpowers/specs/2026-09-26-phase-7-design-system-design.md`](file:///Users/greglawrence/Projects/brewlog/docs/superpowers/specs/2026-09-26-phase-7-design-system-design.md)

## Global Constraints

- **No JetBrains Mono for numbers**: Doses, water targets, elapsed times, ratios, and numeric inputs must format in `Outfit` with `tabular-nums` (`font-['Outfit'] font-light tabular-nums` on web, `Outfit_300Light` on mobile).
- **JetBrains Mono restricted**: Allowed strictly for uppercase method/technical pills (`V60`, `AEROPRESS`) and chassis eyebrow labels.
- **Borders & surfaces**: Must strictly consume `@brewlog/core` tokens (`borderSubtle` `#27272a`, `borderActive` `#3f3f46`, `accent` `#d97736`, `statusError` `#ef4444`). Zero hardcoded arbitrary zinc shades.
- **Mobile touch targets**: All interactive controls (`Button`, pressable `Card`) must adhere to Apple HIG $\ge 44\text{pt}$ minimum touch target.
- **Zero `react-native-web` in Vite**: Web implementation must remain pure semantic HTML with Tailwind v4.

---

### Task 1: Package Scaffolding & Monorepo Configuration

**Files:**
- Create: `packages/ui/package.json`
- Create: `packages/ui/tsconfig.json`
- Create: `packages/ui/vitest.config.ts`
- Create: `packages/ui/src/index.web.ts`
- Create: `packages/ui/src/index.native.ts`
- Modify: `apps/web/package.json`
- Modify: `apps/mobile/package.json`

**Interfaces:**
- Consumes: `@brewlog/core` (`INDUSTRIAL_PRECISION_THEME`, `ThemeColors`)
- Produces: `@brewlog/ui` module resolvable in `@brewlog/web` (web entry) and `@brewlog/mobile` (native entry).

- [ ] **Step 1: Create `packages/ui/package.json`**

```json
{
  "name": "@brewlog/ui",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.web.ts",
  "react-native": "./src/index.native.ts",
  "types": "./src/index.web.ts",
  "exports": {
    ".": {
      "react-native": "./src/index.native.ts",
      "default": "./src/index.web.ts"
    }
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@brewlog/core": "*"
  },
  "peerDependencies": {
    "react": "19.2.8",
    "react-dom": "19.2.8",
    "react-native": "0.86.3"
  },
  "peerDependenciesMeta": {
    "react-dom": { "optional": true },
    "react-native": { "optional": true }
  },
  "devDependencies": {
    "@testing-library/react": "^16.3.3",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.4",
    "jsdom": "^29.1.1",
    "typescript": "^5.7.3",
    "vitest": "^4.1.11"
  }
}
```

- [ ] **Step 2: Create `packages/ui/tsconfig.json` and `packages/ui/vitest.config.ts`**

`packages/ui/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"]
}
```

`packages/ui/vitest.config.ts`:
```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@brewlog/core": path.resolve(__dirname, "../core/src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
  },
});
```

- [ ] **Step 3: Create initial entrypoints `src/index.web.ts` and `src/index.native.ts`**

`packages/ui/src/index.web.ts`:
```typescript
export const UI_PACKAGE_VERSION = '0.1.0';
```

`packages/ui/src/index.native.ts`:
```typescript
export const UI_PACKAGE_VERSION = '0.1.0';
```

- [ ] **Step 4: Add `@brewlog/ui` dependency to `apps/web/package.json` and `apps/mobile/package.json`**

In `apps/web/package.json` under `"dependencies"`:
```json
"@brewlog/ui": "*",
```

In `apps/mobile/package.json` under `"dependencies"`:
```json
"@brewlog/ui": "*",
```

- [ ] **Step 5: Run npm install and typecheck to verify workspace linkage**

Run: `npm install && npm run typecheck`
Expected: Zero type errors across all workspaces.

- [ ] **Step 6: Commit scaffolding**

```bash
git add packages/ui apps/web/package.json apps/mobile/package.json package-lock.json
git commit -m "feat(ui): scaffold @brewlog/ui workspace package and configure export paths"
```

---

### Task 2: `Badge` Primitive (Method & Status Pills)

**Files:**
- Create: `packages/ui/src/badge/Badge.types.ts`
- Create: `packages/ui/src/badge/Badge.web.tsx`
- Create: `packages/ui/src/badge/Badge.native.tsx`
- Create: `packages/ui/src/badge/Badge.web.test.tsx`
- Modify: `packages/ui/src/index.web.ts`
- Modify: `packages/ui/src/index.native.ts`

**Interfaces:**
- Consumes: `@brewlog/core` (`INDUSTRIAL_PRECISION_THEME`)
- Produces: `<Badge label="V60" variant="mono" />` and `<Badge label="Natural" variant="default" />`

- [ ] **Step 1: Write failing test in `packages/ui/src/badge/Badge.web.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Badge } from './Badge.web';

describe('Badge (web)', () => {
  it('renders mono badge with JetBrains Mono uppercase styling', () => {
    render(<Badge label="V60" variant="mono" />);
    const badge = screen.getByText('V60');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('font-mono');
    expect(badge.className).toContain('uppercase');
  });

  it('renders default badge with Outfit sans styling', () => {
    render(<Badge label="Anaerobic" variant="default" />);
    const badge = screen.getByText('Anaerobic');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('font-sans');
    expect(badge.className).not.toContain('font-mono');
  });

  it('applies accent variant border and color', () => {
    render(<Badge label="Peak" variant="accent" />);
    const badge = screen.getByText('Peak');
    expect(badge.className).toContain('text-accent');
    expect(badge.className).toContain('border-accent');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace=@brewlog/ui`
Expected: FAIL with "Cannot find module './Badge.web'"

- [ ] **Step 3: Implement `Badge.types.ts`, `Badge.web.tsx`, and `Badge.native.tsx`**

`packages/ui/src/badge/Badge.types.ts`:
```typescript
export interface BadgeProps {
  label: string;
  variant?: 'mono' | 'default' | 'accent' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md';
  testID?: string;
}
```

`packages/ui/src/badge/Badge.web.tsx`:
```tsx
import React from 'react';
import type { BadgeProps } from './Badge.types';

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'default',
  size = 'md',
  testID,
}) => {
  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs';

  let variantClasses = 'bg-panel-recessed border border-border-subtle text-text-secondary font-sans';
  if (variant === 'mono') {
    variantClasses = 'bg-panel-recessed border border-border-subtle text-text-secondary font-mono uppercase font-bold tracking-wider';
  } else if (variant === 'accent') {
    variantClasses = 'bg-accent/10 border border-accent text-accent font-mono uppercase font-bold tracking-wider';
  } else if (variant === 'success') {
    variantClasses = 'bg-status-success/10 border border-status-success/40 text-status-success font-sans font-medium';
  } else if (variant === 'warning') {
    variantClasses = 'bg-status-warning/10 border border-status-warning/40 text-status-warning font-sans font-medium';
  } else if (variant === 'error') {
    variantClasses = 'bg-status-error/10 border border-status-error/40 text-status-error font-sans font-medium';
  }

  return (
    <span
      data-testid={testID}
      className={`inline-flex items-center justify-center rounded transition-colors ${sizeClasses} ${variantClasses}`}
    >
      {label}
    </span>
  );
};
```

`packages/ui/src/badge/Badge.native.tsx`:
```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { INDUSTRIAL_PRECISION_THEME } from '@brewlog/core';
import type { BadgeProps } from './Badge.types';

const colors = INDUSTRIAL_PRECISION_THEME.colors;

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'default',
  size = 'md',
  testID,
}) => {
  const isMono = variant === 'mono' || variant === 'accent';
  const isSm = size === 'sm';

  const containerStyles = [
    styles.base,
    isSm ? styles.smContainer : styles.mdContainer,
    variant === 'accent' && styles.accentContainer,
    variant === 'success' && styles.successContainer,
    variant === 'warning' && styles.warningContainer,
    variant === 'error' && styles.errorContainer,
  ];

  const textStyles = [
    styles.baseText,
    isSm ? styles.smText : styles.mdText,
    isMono ? styles.monoText : styles.sansText,
    variant === 'accent' && styles.accentText,
    variant === 'success' && styles.successText,
    variant === 'warning' && styles.warningText,
    variant === 'error' && styles.errorText,
  ];

  return (
    <View testID={testID} style={containerStyles}>
      <Text style={textStyles}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 4,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smContainer: { paddingHorizontal: 6, paddingVertical: 2 },
  mdContainer: { paddingHorizontal: 8, paddingVertical: 3 },
  accentContainer: { backgroundColor: `${colors.accent}15`, borderColor: colors.accent },
  successContainer: { backgroundColor: `${colors.statusSuccess}15`, borderColor: `${colors.statusSuccess}60` },
  warningContainer: { backgroundColor: `${colors.statusWarning}15`, borderColor: `${colors.statusWarning}60` },
  errorContainer: { backgroundColor: `${colors.statusError}15`, borderColor: `${colors.statusError}60` },
  baseText: { color: colors.textSecondary },
  smText: { fontSize: 9 },
  mdText: { fontSize: 10 },
  monoText: { fontFamily: 'JetBrainsMono_700Bold', letterSpacing: 0.8, textTransform: 'uppercase' },
  sansText: { fontFamily: 'Outfit_500Medium' },
  accentText: { color: colors.accent },
  successText: { color: colors.statusSuccess },
  warningText: { color: colors.statusWarning },
  errorText: { color: colors.statusError },
});
```

- [ ] **Step 4: Export from `src/index.web.ts` and `src/index.native.ts`**

In `packages/ui/src/index.web.ts`:
```typescript
export * from './badge/Badge.types';
export { Badge } from './badge/Badge.web';
```

In `packages/ui/src/index.native.ts`:
```typescript
export * from './badge/Badge.types';
export { Badge } from './badge/Badge.native';
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test --workspace=@brewlog/ui`
Expected: PASS (3 tests passed).

- [ ] **Step 6: Commit Badge primitive**

```bash
git add packages/ui/src/badge packages/ui/src/index.web.ts packages/ui/src/index.native.ts
git commit -m "feat(ui): implement Badge primitive with strict JetBrains Mono vs Outfit rules"
```

---

### Task 3: `Card` Primitive (Chassis & Panel Containers)

**Files:**
- Create: `packages/ui/src/card/Card.types.ts`
- Create: `packages/ui/src/card/Card.web.tsx`
- Create: `packages/ui/src/card/Card.native.tsx`
- Create: `packages/ui/src/card/Card.web.test.tsx`
- Modify: `packages/ui/src/index.web.ts`
- Modify: `packages/ui/src/index.native.ts`

**Interfaces:**
- Consumes: `@brewlog/core` (`INDUSTRIAL_PRECISION_THEME.colors`)
- Produces: `<Card variant="default">...</Card>` and `<Card variant="interactive" onPress={fn}>...</Card>`

- [ ] **Step 1: Write failing test in `packages/ui/src/card/Card.web.test.tsx`**

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Card } from './Card.web';

describe('Card (web)', () => {
  it('renders children with default panel styling and subtle border', () => {
    render(<Card><span>Panel Content</span></Card>);
    const card = screen.getByText('Panel Content').parentElement;
    expect(card).toBeInTheDocument();
    expect(card?.className).toContain('bg-panel');
    expect(card?.className).toContain('border-border-subtle');
  });

  it('renders recessed variant with panel-recessed class', () => {
    render(<Card variant="recessed"><span>Recessed Content</span></Card>);
    const card = screen.getByText('Recessed Content').parentElement;
    expect(card?.className).toContain('bg-panel-recessed');
  });

  it('triggers onPress when clicked in interactive mode', () => {
    const handlePress = vi.fn();
    render(<Card variant="interactive" onPress={handlePress}><span>Click Me</span></Card>);
    fireEvent.click(screen.getByText('Click Me'));
    expect(handlePress).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace=@brewlog/ui`
Expected: FAIL with "Cannot find module './Card.web'"

- [ ] **Step 3: Implement `Card.types.ts`, `Card.web.tsx`, and `Card.native.tsx`**

`packages/ui/src/card/Card.types.ts`:
```typescript
import type React from 'react';

export interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'recessed' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onPress?: () => void;
  testID?: string;
  accessibilityLabel?: string;
}
```

`packages/ui/src/card/Card.web.tsx`:
```tsx
import React from 'react';
import type { CardProps } from './Card.types';

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  onPress,
  testID,
  accessibilityLabel,
}) => {
  const paddingClasses = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  }[padding];

  let variantClasses = 'bg-panel border border-border-subtle';
  if (variant === 'recessed') {
    variantClasses = 'bg-panel-recessed border border-border-subtle';
  } else if (variant === 'interactive') {
    variantClasses = 'bg-panel border border-border-subtle hover:border-border-active cursor-pointer transition-colors';
  }

  return (
    <div
      data-testid={testID}
      aria-label={accessibilityLabel}
      onClick={onPress}
      role={onPress ? 'button' : undefined}
      tabIndex={onPress ? 0 : undefined}
      onKeyDown={onPress ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPress(); } } : undefined}
      className={`rounded-xl ${paddingClasses} ${variantClasses}`}
    >
      {children}
    </div>
  );
};
```

`packages/ui/src/card/Card.native.tsx`:
```tsx
import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { INDUSTRIAL_PRECISION_THEME } from '@brewlog/core';
import type { CardProps } from './Card.types';

const colors = INDUSTRIAL_PRECISION_THEME.colors;

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  onPress,
  testID,
  accessibilityLabel,
}) => {
  const paddingStyles = {
    none: styles.padNone,
    sm: styles.padSm,
    md: styles.padMd,
    lg: styles.padLg,
  }[padding];

  const surfaceStyles = [
    styles.base,
    paddingStyles,
    variant === 'recessed' ? styles.recessed : styles.panel,
  ];

  if (onPress) {
    return (
      <Pressable
        testID={testID}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          ...surfaceStyles,
          pressed && styles.pressed,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View testID={testID} accessibilityLabel={accessibilityLabel} style={surfaceStyles}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
  },
  panel: { backgroundColor: colors.panel },
  recessed: { backgroundColor: colors.panelRecessed },
  padNone: { padding: 0 },
  padSm: { padding: 12 },
  padMd: { padding: 16 },
  padLg: { padding: 24 },
  pressed: {
    borderColor: colors.borderActive,
    opacity: 0.85,
  },
});
```

- [ ] **Step 4: Export from `src/index.web.ts` and `src/index.native.ts`**

In `packages/ui/src/index.web.ts`:
```typescript
export * from './card/Card.types';
export { Card } from './card/Card.web';
```

In `packages/ui/src/index.native.ts`:
```typescript
export * from './card/Card.types';
export { Card } from './card/Card.native';
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test --workspace=@brewlog/ui`
Expected: PASS (all Card tests pass).

- [ ] **Step 6: Commit Card primitive**

```bash
git add packages/ui/src/card packages/ui/src/index.web.ts packages/ui/src/index.native.ts
git commit -m "feat(ui): implement Card primitive with standardized borderSubtle and panel surfaces"
```

---

### Task 4: `Button` Primitive (Standardized Actions & States)

**Files:**
- Create: `packages/ui/src/button/Button.types.ts`
- Create: `packages/ui/src/button/Button.web.tsx`
- Create: `packages/ui/src/button/Button.native.tsx`
- Create: `packages/ui/src/button/Button.web.test.tsx`
- Modify: `packages/ui/src/index.web.ts`
- Modify: `packages/ui/src/index.native.ts`

**Interfaces:**
- Consumes: `@brewlog/core` (`INDUSTRIAL_PRECISION_THEME.colors`)
- Produces: `<Button label="START BREW" variant="primary" onPress={fn} />`

- [ ] **Step 1: Write failing test in `packages/ui/src/button/Button.web.test.tsx`**

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Button } from './Button.web';

describe('Button (web)', () => {
  it('renders primary button with copper accent background and dark text', () => {
    render(<Button label="START BREW" variant="primary" />);
    const btn = screen.getByRole('button', { name: 'START BREW' });
    expect(btn).toBeInTheDocument();
    expect(btn.className).toContain('bg-copper');
    expect(btn.className).toContain('text-canvas');
    expect(btn.className).toContain('font-mono');
  });

  it('triggers onPress on click when enabled', () => {
    const handlePress = vi.fn();
    render(<Button label="PAUSE" onPress={handlePress} />);
    fireEvent.click(screen.getByRole('button', { name: 'PAUSE' }));
    expect(handlePress).toHaveBeenCalledTimes(1);
  });

  it('does not trigger onPress when disabled or loading', () => {
    const handlePress = vi.fn();
    render(<Button label="SAVE" disabled onPress={handlePress} />);
    const btn = screen.getByRole('button', { name: 'SAVE' });
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(handlePress).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace=@brewlog/ui`
Expected: FAIL with "Cannot find module './Button.web'"

- [ ] **Step 3: Implement `Button.types.ts`, `Button.web.tsx`, and `Button.native.tsx`**

`packages/ui/src/button/Button.types.ts`:
```typescript
import type React from 'react';

export interface ButtonProps {
  label?: string;
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  testID?: string;
  accessibilityLabel?: string;
}
```

`packages/ui/src/button/Button.web.tsx`:
```tsx
import React from 'react';
import type { ButtonProps } from './Button.types';

export const Button: React.FC<ButtonProps> = ({
  label,
  children,
  variant = 'primary',
  size = 'md',
  onPress,
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  testID,
  accessibilityLabel,
}) => {
  const sizeClasses = {
    sm: 'h-8 px-3 text-xs gap-1.5',
    md: 'h-11 px-4 text-xs gap-2',
    lg: 'h-12 px-6 text-sm gap-2.5',
  }[size];

  let variantClasses = 'bg-copper hover:bg-copper-hover text-canvas font-mono font-bold uppercase tracking-wider';
  if (variant === 'secondary') {
    variantClasses = 'bg-panel-recessed hover:bg-zinc-800 text-bone border border-border-subtle hover:border-border-active font-mono font-bold uppercase tracking-wider';
  } else if (variant === 'ghost') {
    variantClasses = 'bg-transparent hover:bg-panel-recessed text-bone-muted hover:text-bone uppercase font-medium';
  } else if (variant === 'danger') {
    variantClasses = 'bg-status-error/10 hover:bg-status-error/20 text-status-error border border-status-error/40 font-mono font-bold uppercase tracking-wider';
  }

  const content = children || label;

  return (
    <button
      type="button"
      data-testid={testID}
      aria-label={accessibilityLabel || (typeof label === 'string' ? label : undefined)}
      disabled={disabled || loading}
      onClick={onPress}
      className={`inline-flex items-center justify-center rounded-md transition-colors select-none focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses} ${variantClasses}`}
    >
      {loading ? (
        <span className="animate-spin mr-1">⟳</span>
      ) : (
        icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>
      )}
      <span>{content}</span>
      {!loading && icon && iconPosition === 'right' && <span className="shrink-0">{icon}</span>}
    </button>
  );
};
```

`packages/ui/src/button/Button.native.tsx`:
```tsx
import React from 'react';
import { Pressable, Text, ActivityIndicator, View, StyleSheet } from 'react-native';
import { INDUSTRIAL_PRECISION_THEME } from '@brewlog/core';
import type { ButtonProps } from './Button.types';

const colors = INDUSTRIAL_PRECISION_THEME.colors;

export const Button: React.FC<ButtonProps> = ({
  label,
  children,
  variant = 'primary',
  size = 'md',
  onPress,
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  testID,
  accessibilityLabel,
}) => {
  const isSm = size === 'sm';
  const isLg = size === 'lg';

  const containerStyles = [
    styles.base,
    isSm ? styles.smContainer : isLg ? styles.lgContainer : styles.mdContainer,
    variant === 'primary' && styles.primaryContainer,
    variant === 'secondary' && styles.secondaryContainer,
    variant === 'ghost' && styles.ghostContainer,
    variant === 'danger' && styles.dangerContainer,
    (disabled || loading) && styles.disabledContainer,
  ];

  const textStyles = [
    styles.baseText,
    isSm ? styles.smText : styles.mdText,
    variant === 'primary' && styles.primaryText,
    variant === 'secondary' && styles.secondaryText,
    variant === 'ghost' && styles.ghostText,
    variant === 'danger' && styles.dangerText,
    disabled && styles.disabledText,
  ];

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || (typeof label === 'string' ? label : undefined)}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        ...containerStyles,
        pressed && !disabled && !loading && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.canvas : colors.accent} size="small" />
      ) : (
        <>
          {icon && iconPosition === 'left' && <View style={styles.iconSlot}>{icon}</View>}
          {children ? children : <Text style={textStyles}>{label}</Text>}
          {icon && iconPosition === 'right' && <View style={styles.iconSlot}>{icon}</View>}
        </>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    gap: 8,
  },
  smContainer: { minHeight: 44, paddingHorizontal: 12, paddingVertical: 8 },
  mdContainer: { minHeight: 48, paddingHorizontal: 16, paddingVertical: 12 },
  lgContainer: { minHeight: 52, paddingHorizontal: 20, paddingVertical: 14 },
  primaryContainer: { backgroundColor: colors.accent },
  secondaryContainer: {
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  ghostContainer: { backgroundColor: 'transparent' },
  dangerContainer: {
    backgroundColor: `${colors.statusError}15`,
    borderWidth: 1,
    borderColor: `${colors.statusError}60`,
  },
  disabledContainer: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
  baseText: {
    fontFamily: 'JetBrainsMono_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  smText: { fontSize: 11 },
  mdText: { fontSize: 12 },
  primaryText: { color: colors.canvas },
  secondaryText: { color: colors.textPrimary },
  ghostText: { color: colors.textSecondary },
  dangerText: { color: colors.statusError },
  disabledText: { color: colors.textMuted },
  iconSlot: { alignItems: 'center', justifyContent: 'center' },
});
```

- [ ] **Step 4: Export from `src/index.web.ts` and `src/index.native.ts`**

In `packages/ui/src/index.web.ts`:
```typescript
export * from './button/Button.types';
export { Button } from './button/Button.web';
```

In `packages/ui/src/index.native.ts`:
```typescript
export * from './button/Button.types';
export { Button } from './button/Button.native';
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test --workspace=@brewlog/ui`
Expected: PASS (all Button tests pass).

- [ ] **Step 6: Commit Button primitive**

```bash
git add packages/ui/src/button packages/ui/src/index.web.ts packages/ui/src/index.native.ts
git commit -m "feat(ui): implement Button primitive with copper/recessed variants and Apple HIG touch targets"
```

---

### Task 5: `Input` Primitive (Numeric & Standard Inputs)

**Files:**
- Create: `packages/ui/src/input/Input.types.ts`
- Create: `packages/ui/src/input/Input.web.tsx`
- Create: `packages/ui/src/input/Input.native.tsx`
- Create: `packages/ui/src/input/Input.web.test.tsx`
- Modify: `packages/ui/src/index.web.ts`
- Modify: `packages/ui/src/index.native.ts`

**Interfaces:**
- Consumes: `@brewlog/core` (`INDUSTRIAL_PRECISION_THEME.colors`)
- Produces: `<Input variant="numeric" value={15} onChangeText={fn} unit="g" label="COFFEE DOSE" />`

- [ ] **Step 1: Write failing test in `packages/ui/src/input/Input.web.test.tsx`**

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Input } from './Input.web';

describe('Input (web)', () => {
  it('renders numeric input in Outfit light tabular-nums without font-mono', () => {
    render(<Input variant="numeric" value="15.0" onChangeText={() => {}} unit="g" label="COFFEE DOSE" />);
    const input = screen.getByLabelText('COFFEE DOSE');
    expect(input).toBeInTheDocument();
    expect(input.className).toContain("font-['Outfit']");
    expect(input.className).toContain('font-light');
    expect(input.className).toContain('tabular-nums');
    expect(input.className).not.toContain('font-mono');
  });

  it('renders unit suffix in Outfit font', () => {
    render(<Input variant="numeric" value="250" onChangeText={() => {}} unit="g" />);
    const unit = screen.getByText('g');
    expect(unit).toBeInTheDocument();
    expect(unit.className).toContain("font-['Outfit']");
  });

  it('calls onChangeText when typed into', () => {
    const handleChange = vi.fn();
    render(<Input value="15" onChangeText={handleChange} label="Dose" />);
    const input = screen.getByLabelText('Dose');
    fireEvent.change(input, { target: { value: '18' } });
    expect(handleChange).toHaveBeenCalledWith('18');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace=@brewlog/ui`
Expected: FAIL with "Cannot find module './Input.web'"

- [ ] **Step 3: Implement `Input.types.ts`, `Input.web.tsx`, and `Input.native.tsx`**

`packages/ui/src/input/Input.types.ts`:
```typescript
export interface InputProps {
  value: string | number;
  onChangeText: (text: string) => void;
  label?: string;
  placeholder?: string;
  variant?: 'default' | 'numeric';
  unit?: string;
  error?: string;
  disabled?: boolean;
  testID?: string;
  accessibilityLabel?: string;
}
```

`packages/ui/src/input/Input.web.tsx`:
```tsx
import React from 'react';
import type { InputProps } from './Input.types';

export const Input: React.FC<InputProps> = ({
  value,
  onChangeText,
  label,
  placeholder,
  variant = 'default',
  unit,
  error,
  disabled = false,
  testID,
  accessibilityLabel,
}) => {
  const isNumeric = variant === 'numeric';

  return (
    <div className="flex flex-col space-y-1">
      {label && (
        <label className="text-[10px] font-mono tracking-widest text-text-muted uppercase">
          {label}
        </label>
      )}
      <div className="relative flex items-center bg-panel-recessed border border-border-subtle focus-within:border-accent rounded-md px-3 py-2 transition-colors">
        <input
          data-testid={testID}
          aria-label={accessibilityLabel || label}
          disabled={disabled}
          type={isNumeric ? 'text' : 'text'}
          inputMode={isNumeric ? 'decimal' : undefined}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChangeText(e.target.value)}
          className={`bg-transparent text-text-primary focus:outline-none w-full ${
            isNumeric
              ? "font-['Outfit'] font-light tabular-nums text-lg text-right pr-1"
              : 'font-sans text-sm text-left'
          }`}
        />
        {unit && (
          <span className="font-['Outfit'] font-light text-text-muted text-sm ml-1 select-none">
            {unit}
          </span>
        )}
      </div>
      {error && <span className="text-[11px] text-status-error font-sans">{error}</span>}
    </div>
  );
};
```

`packages/ui/src/input/Input.native.tsx`:
```tsx
import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { INDUSTRIAL_PRECISION_THEME } from '@brewlog/core';
import type { InputProps } from './Input.types';

const colors = INDUSTRIAL_PRECISION_THEME.colors;

export const Input: React.FC<InputProps> = ({
  value,
  onChangeText,
  label,
  placeholder,
  variant = 'default',
  unit,
  error,
  disabled = false,
  testID,
  accessibilityLabel,
}) => {
  const isNumeric = variant === 'numeric';

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputWrapper, error ? styles.inputWrapperError : null]}>
        <TextInput
          testID={testID}
          accessibilityLabel={accessibilityLabel || label}
          editable={!disabled}
          value={String(value)}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          keyboardType={isNumeric ? 'decimal-pad' : 'default'}
          onChangeText={onChangeText}
          style={[
            styles.input,
            isNumeric ? styles.numericInput : styles.standardInput,
          ]}
        />
        {unit && <Text style={styles.unit}>{unit}</Text>}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  label: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 44,
  },
  inputWrapperError: {
    borderColor: colors.statusError,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  numericInput: {
    fontFamily: 'Outfit_300Light',
    fontSize: 20,
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
  },
  standardInput: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 14,
    textAlign: 'left',
  },
  unit: {
    fontFamily: 'Outfit_300Light',
    fontSize: 14,
    color: colors.textMuted,
    marginLeft: 4,
  },
  errorText: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 11,
    color: colors.statusError,
  },
});
```

- [ ] **Step 4: Export from `src/index.web.ts` and `src/index.native.ts`**

In `packages/ui/src/index.web.ts`:
```typescript
export * from './input/Input.types';
export { Input } from './input/Input.web';
```

In `packages/ui/src/index.native.ts`:
```typescript
export * from './input/Input.types';
export { Input } from './input/Input.native';
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test --workspace=@brewlog/ui`
Expected: PASS (all Input tests pass).

- [ ] **Step 6: Commit Input primitive**

```bash
git add packages/ui/src/input packages/ui/src/index.web.ts packages/ui/src/index.native.ts
git commit -m "feat(ui): implement Input primitive enforcing Outfit tabular figures on numeric values"
```

---

### Task 6: `MetricTile` Primitive (Chassis Instrumentation)

**Files:**
- Create: `packages/ui/src/metric-tile/MetricTile.types.ts`
- Create: `packages/ui/src/metric-tile/MetricTile.web.tsx`
- Create: `packages/ui/src/metric-tile/MetricTile.native.tsx`
- Create: `packages/ui/src/metric-tile/MetricTile.web.test.tsx`
- Modify: `packages/ui/src/index.web.ts`
- Modify: `packages/ui/src/index.native.ts`

**Interfaces:**
- Consumes: `@brewlog/core` (`INDUSTRIAL_PRECISION_THEME.colors`)
- Produces: `<MetricTile label="COFFEE DOSE" value={15.0} unit="g" />`

- [ ] **Step 1: Write failing test in `packages/ui/src/metric-tile/MetricTile.web.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MetricTile } from './MetricTile.web';

describe('MetricTile (web)', () => {
  it('renders uppercase eyebrow label and tabular Outfit value', () => {
    render(<MetricTile label="COFFEE DOSE" value="15.0" unit="g" />);
    const label = screen.getByText('COFFEE DOSE');
    expect(label).toBeInTheDocument();
    expect(label.className).toContain('font-mono');
    expect(label.className).toContain('uppercase');

    const value = screen.getByText('15.0');
    expect(value).toBeInTheDocument();
    expect(value.className).toContain("font-['Outfit']");
    expect(value.className).toContain('tabular-nums');
    expect(value.className).not.toContain('font-mono');
  });

  it('renders accent variant in copper color', () => {
    render(<MetricTile label="POUR TO" value="250" variant="accent" />);
    const value = screen.getByText('250');
    expect(value.className).toContain('text-accent');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace=@brewlog/ui`
Expected: FAIL with "Cannot find module './MetricTile.web'"

- [ ] **Step 3: Implement `MetricTile.types.ts`, `MetricTile.web.tsx`, and `MetricTile.native.tsx`**

`packages/ui/src/metric-tile/MetricTile.types.ts`:
```typescript
export interface MetricTileProps {
  label: string;
  value: string | number;
  unit?: string;
  variant?: 'default' | 'accent' | 'muted';
  size?: 'sm' | 'md' | 'lg';
  testID?: string;
}
```

`packages/ui/src/metric-tile/MetricTile.web.tsx`:
```tsx
import React from 'react';
import type { MetricTileProps } from './MetricTile.types';

export const MetricTile: React.FC<MetricTileProps> = ({
  label,
  value,
  unit,
  variant = 'default',
  size = 'md',
  testID,
}) => {
  const valueSizeClasses = {
    sm: 'text-xl sm:text-2xl',
    md: 'text-2xl sm:text-3xl',
    lg: 'text-3xl sm:text-4xl',
  }[size];

  const colorClasses = {
    default: 'text-text-primary',
    accent: 'text-accent',
    muted: 'text-text-muted',
  }[variant];

  return (
    <div data-testid={testID} className="flex flex-col">
      <span className="text-[10px] font-mono tracking-widest text-text-muted uppercase">
        {label}
      </span>
      <div className="flex items-baseline mt-1">
        <span className={`font-['Outfit'] font-light tabular-nums ${valueSizeClasses} ${colorClasses}`}>
          {value}
        </span>
        {unit && (
          <span className="text-xs text-text-muted font-['Outfit'] font-light ml-1">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
};
```

`packages/ui/src/metric-tile/MetricTile.native.tsx`:
```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { INDUSTRIAL_PRECISION_THEME } from '@brewlog/core';
import type { MetricTileProps } from './MetricTile.types';

const colors = INDUSTRIAL_PRECISION_THEME.colors;

export const MetricTile: React.FC<MetricTileProps> = ({
  label,
  value,
  unit,
  variant = 'default',
  size = 'md',
  testID,
}) => {
  const isSm = size === 'sm';
  const isLg = size === 'lg';

  const valueStyles = [
    styles.value,
    isSm ? styles.smValue : isLg ? styles.lgValue : styles.mdValue,
    variant === 'accent' && styles.accentValue,
    variant === 'muted' && styles.mutedValue,
  ];

  return (
    <View testID={testID} style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueRow}>
        <Text style={valueStyles}>{value}</Text>
        {unit && <Text style={styles.unit}>{unit}</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  label: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 2,
  },
  value: {
    fontFamily: 'Outfit_300Light',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  smValue: { fontSize: 20 },
  mdValue: { fontSize: 26 },
  lgValue: { fontSize: 32 },
  accentValue: { color: colors.accent },
  mutedValue: { color: colors.textMuted },
  unit: {
    fontFamily: 'Outfit_300Light',
    fontSize: 14,
    color: colors.textMuted,
    marginLeft: 2,
  },
});
```

- [ ] **Step 4: Export from `src/index.web.ts` and `src/index.native.ts`**

In `packages/ui/src/index.web.ts`:
```typescript
export * from './metric-tile/MetricTile.types';
export { MetricTile } from './metric-tile/MetricTile.web';
```

In `packages/ui/src/index.native.ts`:
```typescript
export * from './metric-tile/MetricTile.types';
export { MetricTile } from './metric-tile/MetricTile.native';
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test --workspace=@brewlog/ui`
Expected: PASS (all MetricTile tests pass).

- [ ] **Step 6: Commit MetricTile primitive**

```bash
git add packages/ui/src/metric-tile packages/ui/src/index.web.ts packages/ui/src/index.native.ts
git commit -m "feat(ui): implement MetricTile primitive with faceplate eyebrow and Outfit tabular numerals"
```

---

### Task 7: Showcase Fixture (`UiShowcase`) & Workspace Integration Check

**Files:**
- Create: `packages/ui/src/showcase/UiShowcase.types.ts`
- Create: `packages/ui/src/showcase/UiShowcase.web.tsx`
- Create: `packages/ui/src/showcase/UiShowcase.native.tsx`
- Create: `packages/ui/src/showcase/UiShowcase.web.test.tsx`
- Modify: `packages/ui/src/index.web.ts`
- Modify: `packages/ui/src/index.native.ts`

**Interfaces:**
- Consumes: `Button`, `Card`, `Badge`, `Input`, `MetricTile`
- Produces: Mounted fixture demonstrating all 5 primitives across variants.

- [ ] **Step 1: Write test for `UiShowcase.web.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { UiShowcase } from './UiShowcase.web';

describe('UiShowcase (web)', () => {
  it('renders all 5 primitives in the showcase fixture', () => {
    render(<UiShowcase />);
    expect(screen.getByText('SHOWCASE: BUTTONS')).toBeInTheDocument();
    expect(screen.getByText('SHOWCASE: METRIC TILES')).toBeInTheDocument();
    expect(screen.getByText('SHOWCASE: BADGES')).toBeInTheDocument();
    expect(screen.getByText('SHOWCASE: INPUTS')).toBeInTheDocument();
    expect(screen.getByText('SHOWCASE: CARDS')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement `UiShowcase.types.ts`, `UiShowcase.web.tsx`, and `UiShowcase.native.tsx`**

`packages/ui/src/showcase/UiShowcase.types.ts`:
```typescript
export interface UiShowcaseProps {
  testID?: string;
}
```

`packages/ui/src/showcase/UiShowcase.web.tsx`:
```tsx
import React, { useState } from 'react';
import { Button } from '../button/Button.web';
import { Card } from '../card/Card.web';
import { Badge } from '../badge/Badge.web';
import { Input } from '../input/Input.web';
import { MetricTile } from '../metric-tile/MetricTile.web';
import type { UiShowcaseProps } from './UiShowcase.types';

export const UiShowcase: React.FC<UiShowcaseProps> = ({ testID }) => {
  const [dose, setDose] = useState('18.5');

  return (
    <div data-testid={testID} className="p-6 space-y-8 bg-canvas text-text-primary max-w-2xl mx-auto">
      <section className="space-y-3">
        <h2 className="text-xs font-mono uppercase text-text-muted tracking-wider">SHOWCASE: BUTTONS</h2>
        <div className="flex flex-wrap gap-3">
          <Button label="START BREW" variant="primary" />
          <Button label="SETTINGS" variant="secondary" />
          <Button label="CANCEL" variant="ghost" />
          <Button label="DELETE BAG" variant="danger" />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-mono uppercase text-text-muted tracking-wider">SHOWCASE: METRIC TILES</h2>
        <div className="grid grid-cols-3 gap-4 p-4 rounded-xl bg-panel border border-border-subtle">
          <MetricTile label="COFFEE DOSE" value="15.0" unit="g" />
          <MetricTile label="WATER TARGET" value="250" unit="g" />
          <MetricTile label="POUR TO" value="100" unit="g" variant="accent" />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-mono uppercase text-text-muted tracking-wider">SHOWCASE: BADGES</h2>
        <div className="flex flex-wrap gap-2">
          <Badge label="V60" variant="mono" />
          <Badge label="AEROPRESS" variant="mono" />
          <Badge label="NATURAL PROCESS" variant="default" />
          <Badge label="PEAK FRESHNESS" variant="success" />
          <Badge label="NEEDS REST" variant="warning" />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-mono uppercase text-text-muted tracking-wider">SHOWCASE: INPUTS</h2>
        <div className="grid grid-cols-2 gap-4">
          <Input label="COFFEE DOSE" variant="numeric" value={dose} onChangeText={setDose} unit="g" />
          <Input label="RECIPE TITLE" variant="default" value="Morning Kalita" onChangeText={() => {}} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-mono uppercase text-text-muted tracking-wider">SHOWCASE: CARDS</h2>
        <div className="grid grid-cols-2 gap-4">
          <Card variant="default"><p className="text-sm">Standard Chassis Card</p></Card>
          <Card variant="recessed"><p className="text-sm text-text-secondary">Recessed Panel Card</p></Card>
        </div>
      </section>
    </div>
  );
};
```

`packages/ui/src/showcase/UiShowcase.native.tsx`:
```tsx
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Button } from '../button/Button.native';
import { Card } from '../card/Card.native';
import { Badge } from '../badge/Badge.native';
import { Input } from '../input/Input.native';
import { MetricTile } from '../metric-tile/MetricTile.native';
import { INDUSTRIAL_PRECISION_THEME } from '@brewlog/core';
import type { UiShowcaseProps } from './UiShowcase.types';

const colors = INDUSTRIAL_PRECISION_THEME.colors;

export const UiShowcase: React.FC<UiShowcaseProps> = ({ testID }) => {
  const [dose, setDose] = useState('18.5');

  return (
    <ScrollView testID={testID} contentContainerStyle={styles.container}>
      <Text style={styles.sectionHeader}>SHOWCASE: BUTTONS</Text>
      <View style={styles.row}>
        <Button label="START BREW" variant="primary" />
        <Button label="SETTINGS" variant="secondary" />
      </View>

      <Text style={styles.sectionHeader}>SHOWCASE: METRIC TILES</Text>
      <View style={styles.tileGrid}>
        <MetricTile label="COFFEE DOSE" value="15.0" unit="g" />
        <MetricTile label="WATER TARGET" value="250" unit="g" />
        <MetricTile label="POUR TO" value="100" unit="g" variant="accent" />
      </View>

      <Text style={styles.sectionHeader}>SHOWCASE: BADGES</Text>
      <View style={styles.badgeRow}>
        <Badge label="V60" variant="mono" />
        <Badge label="AEROPRESS" variant="mono" />
        <Badge label="NATURAL" variant="default" />
        <Badge label="PEAK" variant="success" />
      </View>

      <Text style={styles.sectionHeader}>SHOWCASE: INPUTS</Text>
      <Input label="COFFEE DOSE" variant="numeric" value={dose} onChangeText={setDose} unit="g" />

      <Text style={styles.sectionHeader}>SHOWCASE: CARDS</Text>
      <Card variant="default">
        <Text style={styles.cardText}>Standard Chassis Card</Text>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16, backgroundColor: colors.canvas },
  sectionHeader: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 1.2,
    marginTop: 8,
  },
  row: { flexDirection: 'row', gap: 12 },
  tileGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 12,
    padding: 16,
  },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cardText: { color: colors.textPrimary, fontFamily: 'Outfit_400Regular', fontSize: 14 },
});
```

- [ ] **Step 3: Export `UiShowcase` from `src/index.web.ts` and `src/index.native.ts`**

In `packages/ui/src/index.web.ts`:
```typescript
export * from './showcase/UiShowcase.types';
export { UiShowcase } from './showcase/UiShowcase.web';
```

In `packages/ui/src/index.native.ts`:
```typescript
export * from './showcase/UiShowcase.types';
export { UiShowcase } from './showcase/UiShowcase.native';
```

- [ ] **Step 4: Run full test suite and type check**

Run: `npm run test --workspace=@brewlog/ui && npm run typecheck`
Expected: PASS across all tests and zero typecheck errors.

- [ ] **Step 5: Verify web production build**

Run: `npm run build --workspace=@brewlog/web`
Expected: Successful Vite production bundle.

- [ ] **Step 6: Commit showcase and final integration**

```bash
git add packages/ui docs/superpowers/plans/2026-09-26-phase-7-design-system.md
git commit -m "feat(ui): complete Phase 7 design system primitives, showcase fixture, and workspace export integration"
```
