import { darkTheme, lightTheme, type ThemePalette } from '@ncanny/ui/tokens';

/** Turns a "R G B" token into a React Native colour. */
export function channelColor(channels: string): string {
  const [red, green, blue] = channels.split(' ');
  return `rgb(${red}, ${green}, ${blue})`;
}

export interface AppColors {
  surface: string;
  surfaceRaised: string;
  surfaceSunken: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryStrong: string;
  primarySoft: string;
  primaryContrast: string;
  accent: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
}

export function colorsFromPalette(palette: ThemePalette): AppColors {
  return {
    surface: channelColor(palette.surface),
    surfaceRaised: channelColor(palette.surfaceRaised),
    surfaceSunken: channelColor(palette.surfaceSunken),
    border: channelColor(palette.border),
    text: channelColor(palette.text),
    textMuted: channelColor(palette.textMuted),
    primary: channelColor(palette.primary),
    primaryStrong: channelColor(palette.primaryStrong),
    primarySoft: channelColor(palette.primarySoft),
    primaryContrast: channelColor(palette.primaryContrast),
    accent: channelColor(palette.accent),
    success: channelColor(palette.success),
    warning: channelColor(palette.warning),
    danger: channelColor(palette.danger),
    info: channelColor(palette.info),
  };
}

export const lightColors = colorsFromPalette(lightTheme);
export const darkColors = colorsFromPalette(darkTheme);
