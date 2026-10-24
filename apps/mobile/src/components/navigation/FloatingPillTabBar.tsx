import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Keyboard,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Timer,
  BookOpen,
  Bean,
  Scale,
  Award,
} from 'lucide-react-native';
import { INDUSTRIAL_PRECISION_THEME } from '@brewlog/core';
import { FONTS } from '../../theme/fonts';
import { mobileFeedback } from '../../lib/mobileFeedback';

const { colors } = INDUSTRIAL_PRECISION_THEME;

export {
  FLOATING_TAB_BAR_HEIGHT,
  FLOATING_TAB_BAR_BOTTOM_MARGIN,
  TAB_SCREEN_CONTENT_CLEARANCE,
  getTabScreenBottomPadding,
} from './tabBarConstants';

import {
  FLOATING_TAB_BAR_HEIGHT,
  FLOATING_TAB_BAR_BOTTOM_MARGIN,
} from './tabBarConstants';

export interface BottomTabBarProps {
  state: {
    index: number;
    routes: Array<{ key: string; name: string; params?: object }>;
  };
  descriptors?: Record<string, unknown>;
  navigateToTab?: (routeKey: string) => void;
  navigation?: {
    navigate: (name: string, params?: object) => void;
    emit?: (event: {
      type: string;
      target: string;
      canPreventDefault?: boolean;
    }) => {
      defaultPrevented: boolean;
    };
  };
  emitter?: {
    emit: (event: any) => any;
  };
  insets?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

interface TabItemConfig {
  label: string;
  Icon: React.ComponentType<{ size: number; color: string }>;
}

const TAB_CONFIG: Record<string, TabItemConfig> = {
  index: {
    label: 'Timer',
    Icon: Timer,
  },
  stash: {
    label: 'Stash',
    Icon: Bean,
  },
  recipes: {
    label: 'Recipes',
    Icon: BookOpen,
  },
  equipment: {
    label: 'Equipment',
    Icon: Scale,
  },
  reviews: {
    label: 'Reviews',
    Icon: Award,
  },
};

const PILL_WIDTH = 54;
const PILL_HEIGHT = 30;
const TAB_ICON_TOP = 8;
const HORIZONTAL_PADDING = 8;

interface TabButtonProps {
  routeKey: string;
  routeName: string;
  isFocused: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  onLayout: (layout: { x: number; width: number }) => void;
  label: React.ReactNode;
  accessibilityLabel: string;
  renderIcon: (color: string) => React.ReactNode;
}

const TabButton: React.FC<TabButtonProps> = ({
  isFocused,
  onPress,
  onLongPress,
  onLayout,
  label,
  accessibilityLabel,
  renderIcon,
}) => {
  const scaleAnim = useRef(new Animated.Value(isFocused ? 1.08 : 1)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: isFocused ? 1.08 : 1,
      useNativeDriver: true,
      friction: 8,
      tension: 100,
    }).start();
  }, [isFocused, scaleAnim]);

  return (
    <View
      onLayout={(e) => onLayout(e.nativeEvent.layout)}
      style={styles.tabButtonWrapper}
    >
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        accessibilityRole="tab"
        accessibilityState={{ selected: isFocused }}
        accessibilityLabel={accessibilityLabel}
        android_ripple={{
          color: colors.borderActive,
          borderless: true,
          radius: 28,
        }}
        style={styles.tabButton}
      >
        <Animated.View
          style={[
            styles.iconWrapper,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {renderIcon(isFocused ? colors.accent : colors.textMuted)}
        </Animated.View>
        {typeof label === 'string' ? (
          <Text
            style={[
              styles.label,
              isFocused && styles.labelActive,
            ]}
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
          >
            {label}
          </Text>
        ) : (
          label
        )}
      </Pressable>
    </View>
  );
};

export const FloatingPillTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigateToTab,
  navigation,
  emitter,
  insets: propInsets,
}) => {
  const contextInsets = useSafeAreaInsets();
  const insets = propInsets ?? contextInsets;
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const tabLayoutsRef = useRef<Record<number, { x: number; width: number }>>({});
  const animX = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const hasInitialized = useRef(false);

  const animateToTab = useCallback(
    (index: number) => {
      const layout = tabLayoutsRef.current[index];
      if (!layout) return;
      const targetX = layout.x + (layout.width - PILL_WIDTH) / 2;
      if (!hasInitialized.current) {
        animX.setValue(targetX);
        hasInitialized.current = true;
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }).start();
      } else {
        Animated.spring(animX, {
          toValue: targetX,
          useNativeDriver: true,
          tension: 80,
          friction: 12,
        }).start();
      }
    },
    [animX, opacityAnim]
  );

  useEffect(() => {
    animateToTab(state.index);
  }, [state.index, animateToTab]);

  const handleTabLayout = useCallback(
    (index: number, layout: { x: number; width: number }) => {
      tabLayoutsRef.current[index] = layout;
      if (index === state.index) {
        animateToTab(index);
      }
    },
    [state.index, animateToTab]
  );

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handlePress = useCallback(
    (routeKey: string, routeName: string, isFocused: boolean, params?: object) => {
      const emitEvent = emitter?.emit?.bind(emitter) ?? navigation?.emit?.bind(navigation);
      const event = emitEvent?.({
        type: 'tabPress',
        target: routeKey,
        canPreventDefault: true,
      });

      if (isFocused) return;
      if (event?.defaultPrevented) return;

      mobileFeedback.triggerHapticTap();

      if (typeof navigateToTab === 'function') {
        navigateToTab(routeKey);
      } else if (navigation && typeof navigation.navigate === 'function') {
        navigation.navigate(routeName, params);
      }
    },
    [emitter, navigateToTab, navigation]
  );

  const handleLongPress = useCallback(
    (routeKey: string) => {
      const emitEvent = emitter?.emit?.bind(emitter) ?? navigation?.emit?.bind(navigation);
      emitEvent?.({
        type: 'tabLongPress',
        target: routeKey,
      });
    },
    [emitter, navigation]
  );

  if (isKeyboardVisible) {
    return null;
  }

  const bottomOffset = Math.max(insets.bottom, FLOATING_TAB_BAR_BOTTOM_MARGIN);

  return (
    <View
      style={[
        styles.container,
        {
          bottom: bottomOffset,
        },
      ]}
      accessibilityRole="tablist"
      testID="floating-pill-tab-bar"
    >
      {/* Sliding animated indicator pill */}
      <Animated.View
        testID="sliding-pill-indicator"
        style={[
          styles.slidingIndicator,
          {
            opacity: opacityAnim,
            transform: [{ translateX: animX }],
          },
        ]}
        pointerEvents="none"
      />

      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const descriptor = descriptors?.[route.key] as { options?: any } | undefined;
        const options = descriptor?.options;

        const defaultItem = TAB_CONFIG[route.name] ?? {
          label: route.name,
          Icon: Timer,
        };

        const label =
          typeof options?.tabBarLabel === 'function'
            ? options.tabBarLabel({
                focused: isFocused,
                color: isFocused ? colors.accent : colors.textMuted,
                position: 'below-icon',
                children: defaultItem.label,
              })
            : typeof options?.tabBarLabel === 'string'
            ? options.tabBarLabel
            : typeof options?.title === 'string'
            ? options.title
            : defaultItem.label;

        const accessibilityLabel =
          options?.tabBarAccessibilityLabel ??
          (typeof label === 'string' ? `${label} tab` : `${route.name} tab`);

        const renderIcon = (iconColor: string) => {
          if (typeof options?.tabBarIcon === 'function') {
            return options.tabBarIcon({
              focused: isFocused,
              color: iconColor,
              size: 19,
            });
          }
          const DefaultIcon = defaultItem.Icon;
          return <DefaultIcon size={19} color={iconColor} />;
        };

        return (
          <TabButton
            key={route.key}
            routeKey={route.key}
            routeName={route.name}
            isFocused={isFocused}
            label={label}
            accessibilityLabel={accessibilityLabel}
            renderIcon={renderIcon}
            onPress={() => handlePress(route.key, route.name, isFocused, route.params)}
            onLongPress={() => handleLongPress(route.key)}
            onLayout={(layout) => handleTabLayout(index, layout)}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: FLOATING_TAB_BAR_HEIGHT,
    borderRadius: 32,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: HORIZONTAL_PADDING,
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  slidingIndicator: {
    position: 'absolute',
    left: 0,
    top: TAB_ICON_TOP,
    width: PILL_WIDTH,
    height: PILL_HEIGHT,
    borderRadius: PILL_HEIGHT / 2,
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.borderActive,
  },
  tabButtonWrapper: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  tabButton: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: TAB_ICON_TOP,
    borderRadius: 26,
    minWidth: 48,
    minHeight: 48,
  },
  iconWrapper: {
    width: PILL_WIDTH,
    height: PILL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: FONTS.sansMedium,
    fontSize: 10,
    marginTop: 2,
    color: colors.textMuted,
    letterSpacing: 0.2,
  },
  labelActive: {
    fontFamily: FONTS.sansBold,
    color: colors.textPrimary,
    fontWeight: '700',
  },
});
