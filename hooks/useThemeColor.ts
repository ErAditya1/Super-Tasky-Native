/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { theme } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof theme.light & keyof typeof theme.dark
) {
  const th = useColorScheme() ?? 'light';
  const colorFromProps = props[th];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return theme[th][colorName];
  }
}
