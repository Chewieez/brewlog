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
  const cache = new Map<string, T>();

  return function useStyles(): T {
    const { colors, theme } = useTheme();

    const existing = cache.get(theme.id);
    if (existing !== undefined) {
      return existing;
    }

    const computed = styleFactory(colors, theme);
    cache.set(theme.id, computed);
    return computed;
  };
}
