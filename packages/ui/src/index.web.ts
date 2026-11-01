export const UI_PACKAGE_VERSION = '0.1.0';

export * from './badge/Badge.types';
export { Badge } from './badge/Badge.web';

export * from './card/Card.types';
export { Card } from './card/Card.web';

export * from './button/Button.types';
export { Button } from './button/Button.web';

export * from './input/Input.types';
export { Input } from './input/Input.web';

export * from './metric-tile/MetricTile.types';
export { MetricTile } from './metric-tile/MetricTile.web';

export * from './showcase/UiShowcase.types';
export { UiShowcase } from './showcase/UiShowcase.web';

export * from './segmented-control/SegmentedControl.types';
export { SegmentedControl } from './segmented-control/SegmentedControl.web';

export {
  THEMES,
  resolveTheme,
  DEFAULT_THEME,
  darkTheme,
  TACTILE_DARK_THEME,
  CRISP_STUDIO_LIGHT_THEME,
  INDUSTRIAL_PRECISION_THEME,
} from '@brewlog/core';
export type { ThemeTokens, ThemeColors } from '@brewlog/core';

