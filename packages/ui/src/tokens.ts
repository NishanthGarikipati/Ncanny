/**
 * Design tokens as data.
 *
 * The web app renders these as CSS variables and the mobile app consumes the
 * same values directly, so the two platforms cannot drift apart visually.
 */

export interface ThemePalette {
  surface: string;
  surfaceRaised: string;
  surfaceSunken: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textInverse: string;
  primary: string;
  primaryStrong: string;
  primarySoft: string;
  primaryContrast: string;
  accent: string;
  accentSoft: string;
  accentContrast: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  info: string;
  infoSoft: string;
  /** Scrim behind modals and sheets. */
  overlay: string;
}

/** Light is the default theme: it is the most readable on the low-cost screens many students use. */
export const lightTheme: ThemePalette = {
  surface: '255 255 255',
  surfaceRaised: '248 250 252',
  surfaceSunken: '241 245 249',
  border: '226 232 240',
  borderStrong: '203 213 225',
  text: '15 23 42',
  textMuted: '71 85 105',
  textInverse: '255 255 255',
  primary: '14 116 144',
  primaryStrong: '8 86 110',
  primarySoft: '224 247 253',
  primaryContrast: '255 255 255',
  accent: '192 38 126',
  accentSoft: '253 232 244',
  accentContrast: '255 255 255',
  success: '21 128 61',
  successSoft: '220 252 231',
  warning: '161 98 7',
  warningSoft: '254 249 195',
  danger: '185 28 28',
  dangerSoft: '254 226 226',
  info: '29 78 216',
  infoSoft: '219 234 254',
  overlay: '15 23 42',
};

/**
 * Dark theme. The concept art is strongly neon-on-dark; these values keep that
 * character while holding text contrast at or above 4.5:1 (docs/UI_UX.md).
 */
export const darkTheme: ThemePalette = {
  surface: '10 15 28',
  surfaceRaised: '19 26 43',
  surfaceSunken: '6 10 20',
  border: '38 48 72',
  borderStrong: '58 70 100',
  text: '237 242 252',
  textMuted: '165 178 202',
  textInverse: '10 15 28',
  primary: '56 211 240',
  primaryStrong: '125 229 248',
  primarySoft: '12 46 61',
  primaryContrast: '6 20 28',
  accent: '244 114 182',
  accentSoft: '61 18 44',
  accentContrast: '32 6 22',
  success: '74 222 128',
  successSoft: '9 48 27',
  warning: '250 204 21',
  warningSoft: '55 42 6',
  danger: '248 113 113',
  dangerSoft: '60 14 14',
  info: '125 170 255',
  infoSoft: '14 32 66',
  overlay: '2 5 12',
};

export const themes = { light: lightTheme, dark: darkTheme } as const;
export type ThemeName = keyof typeof themes;

const CSS_VARIABLE_NAMES: Record<keyof ThemePalette, string> = {
  surface: '--ncanny-surface',
  surfaceRaised: '--ncanny-surface-raised',
  surfaceSunken: '--ncanny-surface-sunken',
  border: '--ncanny-border',
  borderStrong: '--ncanny-border-strong',
  text: '--ncanny-text',
  textMuted: '--ncanny-text-muted',
  textInverse: '--ncanny-text-inverse',
  primary: '--ncanny-primary',
  primaryStrong: '--ncanny-primary-strong',
  primarySoft: '--ncanny-primary-soft',
  primaryContrast: '--ncanny-primary-contrast',
  accent: '--ncanny-accent',
  accentSoft: '--ncanny-accent-soft',
  accentContrast: '--ncanny-accent-contrast',
  success: '--ncanny-success',
  successSoft: '--ncanny-success-soft',
  warning: '--ncanny-warning',
  warningSoft: '--ncanny-warning-soft',
  danger: '--ncanny-danger',
  dangerSoft: '--ncanny-danger-soft',
  info: '--ncanny-info',
  infoSoft: '--ncanny-info-soft',
  overlay: '--ncanny-overlay',
};

/** Renders a palette as a CSS declaration block for a theme selector. */
export function paletteToCssVariables(palette: ThemePalette): string {
  return (Object.keys(CSS_VARIABLE_NAMES) as (keyof ThemePalette)[])
    .map((key) => `${CSS_VARIABLE_NAMES[key]}: ${palette[key]};`)
    .join('\n  ');
}

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, '2xl': 32, '3xl': 48 } as const;
export const radii = { sm: 6, md: 10, lg: 16, xl: 24, full: 9999 } as const;
export const motion = { fast: 120, base: 180, slow: 240 } as const;
