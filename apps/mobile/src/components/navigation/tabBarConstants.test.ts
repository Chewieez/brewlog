import { describe, it, expect } from 'vitest';
import {
  FLOATING_TAB_BAR_HEIGHT,
  FLOATING_TAB_BAR_BOTTOM_MARGIN,
  TAB_SCREEN_CONTENT_CLEARANCE,
  getTabScreenBottomPadding,
} from './tabBarConstants';

describe('tabBarConstants', () => {
  it('exports expected layout dimensions', () => {
    expect(FLOATING_TAB_BAR_HEIGHT).toBe(64);
    expect(FLOATING_TAB_BAR_BOTTOM_MARGIN).toBe(12);
    expect(TAB_SCREEN_CONTENT_CLEARANCE).toBe(16);
  });

  describe('getTabScreenBottomPadding', () => {
    it('uses fallback bottom margin when bottom inset is 0', () => {
      expect(getTabScreenBottomPadding(0)).toBe(
        FLOATING_TAB_BAR_BOTTOM_MARGIN +
        FLOATING_TAB_BAR_HEIGHT +
        TAB_SCREEN_CONTENT_CLEARANCE
      );
      expect(getTabScreenBottomPadding(0)).toBe(92);
    });

    it('uses fallback bottom margin when bottom inset is less than minimum margin', () => {
      expect(getTabScreenBottomPadding(6)).toBe(92);
    });

    it('calculates clearance dynamically with iOS safe area inset (34dp)', () => {
      expect(getTabScreenBottomPadding(34)).toBe(34 + 64 + 16);
      expect(getTabScreenBottomPadding(34)).toBe(114);
    });

    it('calculates clearance dynamically with Android 3-button navigation inset (48dp)', () => {
      expect(getTabScreenBottomPadding(48)).toBe(48 + 64 + 16);
      expect(getTabScreenBottomPadding(48)).toBe(128);
    });
  });
});
