import { StyleSheet } from 'react-native';
import { useTheme } from './ThemeContext';
import { ThemeColors, ThemeTokens } from './theme';

type NamedStyles<T> = StyleSheet.NamedStyles<T>;
type StyleFactory<T extends NamedStyles<T> | NamedStyles<any>> = (
  colors: ThemeColors,
  theme: ThemeTokens
) => T;

export function makeStyles<T extends NamedStyles<T> | NamedStyles<any>>(
  styleFactory: StyleFactory<T>
) {
  let cachedThemeId: string | null = null;
  let cachedStyles: T | null = null;

  return function useStyles(): T {
    const { colors, theme } = useTheme();

    if (cachedStyles !== null && cachedThemeId === theme.id) {
      return cachedStyles;
    }

    const createFn =
      typeof StyleSheet !== 'undefined' && typeof StyleSheet.create === 'function'
        ? StyleSheet.create
        : (s: any) => s;

    cachedStyles = createFn(styleFactory(colors, theme));
    cachedThemeId = theme.id;
    return cachedStyles;
  };
}
