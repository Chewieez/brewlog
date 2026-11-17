import type React from 'react';

/**
 * Moves focus horizontally across enabled option buttons on ArrowLeft,
 * ArrowRight, Home, and End keys, wrapping around at the boundaries.
 */
export function handleHorizontalOptionKeyDown(
  event: React.KeyboardEvent<HTMLButtonElement>,
  currentIndex: number,
  buttonRefs: React.MutableRefObject<(HTMLButtonElement | null)[]>,
  disabledStates?: boolean[]
): void {
  const { key } = event;
  if (key !== 'ArrowRight' && key !== 'ArrowLeft' && key !== 'Home' && key !== 'End') {
    return;
  }

  const total = buttonRefs.current.length;
  const enabledIndices: number[] = [];
  for (let i = 0; i < total; i += 1) {
    const btn = buttonRefs.current[i];
    const isDisabled = disabledStates ? Boolean(disabledStates[i]) : Boolean(btn?.disabled);
    if (btn && !isDisabled) {
      enabledIndices.push(i);
    }
  }

  if (enabledIndices.length === 0) return;

  const currentPos = enabledIndices.indexOf(currentIndex);
  let targetIndex: number;

  if (key === 'Home') {
    targetIndex = enabledIndices[0];
  } else if (key === 'End') {
    targetIndex = enabledIndices[enabledIndices.length - 1];
  } else if (key === 'ArrowRight') {
    const nextPos = currentPos === -1 ? 0 : (currentPos + 1) % enabledIndices.length;
    targetIndex = enabledIndices[nextPos];
  } else {
    const prevPos =
      currentPos === -1
        ? enabledIndices.length - 1
        : (currentPos - 1 + enabledIndices.length) % enabledIndices.length;
    targetIndex = enabledIndices[prevPos];
  }

  event.preventDefault();
  buttonRefs.current[targetIndex]?.focus();
}
