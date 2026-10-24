export const FLOATING_TAB_BAR_HEIGHT = 64;
export const FLOATING_TAB_BAR_BOTTOM_MARGIN = 12;
export const TAB_SCREEN_CONTENT_CLEARANCE = 16;

/**
 * Calculates dynamic bottom padding for tab screens so content clears the
 * floating pill tab bar (or native tab bar) plus bottom safe area insets
 * (e.g., Android 3-button navigation bar, iOS home indicator).
 */
export function getTabScreenBottomPadding(bottomInset: number = 0): number {
  return (
    Math.max(bottomInset, FLOATING_TAB_BAR_BOTTOM_MARGIN) +
    FLOATING_TAB_BAR_HEIGHT +
    TAB_SCREEN_CONTENT_CLEARANCE
  );
}
