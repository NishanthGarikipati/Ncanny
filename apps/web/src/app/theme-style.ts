import { darkTheme, lightTheme, paletteToCssVariables } from '@ncanny/ui';

/**
 * Both palettes as a stylesheet. Generating this from the token module means a
 * colour can only be changed in one place, and mobile reads the same values.
 */
export const themeStyle = `
:root {
  ${paletteToCssVariables(lightTheme)}
  --font-display: var(--ncanny-font-display, 'Inter');
  --font-body: var(--ncanny-font-body, 'Inter');
}

[data-theme='dark'] {
  ${paletteToCssVariables(darkTheme)}
}
`;

/**
 * Applies the stored or system theme before first paint. Inlined in <head> so
 * that a dark-theme user never sees a light flash.
 */
export const themeBootstrapScript = `
(function () {
  try {
    var stored = window.localStorage.getItem('ncanny.theme');
    var theme = stored === 'light' || stored === 'dark' ? stored : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
  } catch (error) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
`;
