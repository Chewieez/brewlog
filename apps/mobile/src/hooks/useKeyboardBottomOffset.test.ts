/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Keyboard, Platform } from 'react-native';
import { useKeyboardBottomOffset } from './useKeyboardBottomOffset';

vi.mock('react-native', () => {
  let listeners: Record<string, ((e: any) => void)[]> = {};
  return {
    Platform: { OS: 'android' },
    Keyboard: {
      addListener: vi.fn((event: string, callback: (e: any) => void) => {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(callback);
        return {
          remove: vi.fn(() => {
            listeners[event] = listeners[event].filter((cb) => cb !== callback);
          }),
        };
      }),
      __emit: (event: string, data?: any) => {
        listeners[event]?.forEach((cb) => cb(data));
      },
      __reset: () => {
        listeners = {};
      },
    },
  };
});

describe('useKeyboardBottomOffset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (Keyboard as any).__reset();
    Platform.OS = 'android';
  });

  it('returns basePadding initially when keyboard is closed', () => {
    const { result } = renderHook(() => useKeyboardBottomOffset(48));
    expect(result.current).toBe(48);
  });

  it('adds keyboard height on Android when keyboardDidShow fires', () => {
    const { result } = renderHook(() => useKeyboardBottomOffset(48));
    act(() => {
      (Keyboard as any).__emit('keyboardDidShow', {
        endCoordinates: { height: 320 },
      });
    });
    expect(result.current).toBe(368);

    act(() => {
      (Keyboard as any).__emit('keyboardDidHide');
    });
    expect(result.current).toBe(48);
  });

  it('returns only basePadding on iOS where native insets are used', () => {
    Platform.OS = 'ios';
    const { result } = renderHook(() => useKeyboardBottomOffset(48));
    act(() => {
      (Keyboard as any).__emit('keyboardWillShow', {
        endCoordinates: { height: 320 },
      });
    });
    expect(result.current).toBe(48);
  });
});
