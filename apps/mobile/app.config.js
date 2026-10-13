/**
 * Expo reads this instead of app.json. The API URL comes from the environment
 * so a staging build does not have to edit source, and so the value is never a
 * secret (it is compiled into the app).
 */

/** @type {import('expo/config').ExpoConfig} */
const config = {
  name: 'Ncanny',
  slug: 'ncanny',
  version: '0.1.0',
  orientation: 'portrait',
  scheme: 'ncanny',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.ncanny.app',
  },
  android: {
    package: 'com.ncanny.app',
    edgeToEdgeEnabled: true,
  },
  plugins: ['expo-router', 'expo-secure-store'],
  experiments: {
    typedRoutes: false,
  },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000',
  },
};

module.exports = config;
