import type { ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { useTheme } from './ThemeContext';
import { ThemeColors, ThemeTokens } from './theme';

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };
type StyleFactory<T extends NamedStyles<T>> = (
  colors: ThemeColors,
  theme: ThemeTokens
) => T;

export function makeStyles<T extends NamedStyles<T>>(
  styleFactory: StyleFactory<T>
) {
  let cachedThemeId: string | null = null;
  let cachedStyles: T | null = null;

  return function useStyles(): T {
    const { colors, theme } = useTheme();

    if (cachedStyles !== null && cachedThemeId === theme.id) {
      return cachedStyles;
    }

    const computed = styleFactory(colors, theme);
    cachedStyles = computed;
    cachedThemeId = theme.id;
    return computed;
  };
}
