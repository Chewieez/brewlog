import { useState, useEffect } from 'react';
import { Keyboard, Platform, KeyboardEvent } from 'react-native';

/**
 * Returns dynamic bottom padding for ScrollViews on forms.
 * On Android (where windowSoftInputMode="adjustResize" is active in Expo Go), adding keyboardHeight
 * provides the critical extra scroll clearance at the bottom of the content container so
 * inputs near the bottom of the screen can scroll well above the soft keyboard.
 * On iOS, automaticallyAdjustKeyboardInsets handles native insets.
 */
export function useKeyboardBottomOffset(basePadding: number = 48): number {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e: KeyboardEvent) => {
      if (e?.endCoordinates?.height) {
        setKeyboardHeight(e.endCoordinates.height);
      }
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return basePadding + (Platform.OS === 'android' ? keyboardHeight : 0);
}
