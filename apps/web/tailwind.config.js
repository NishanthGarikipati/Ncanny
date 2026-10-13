const preset = require('@ncanny/config/tailwind.preset.js');

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [preset],
  content: [
    './src/**/*.{ts,tsx}',
    // The design system lives outside this app but ships Tailwind classes.
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
};
