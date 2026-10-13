import { createContext, useContext, type ReactNode } from 'react';
import { darkColors, lightColors, type AppColors } from './colors';

const ThemeContext = createContext<AppColors>(lightColors);

export function ThemeProvider({
  scheme,
  children,
}: {
  scheme: 'light' | 'dark';
  children: ReactNode;
}) {
  return (
    <ThemeContext.Provider value={scheme === 'dark' ? darkColors : lightColors}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): AppColors {
  return useContext(ThemeContext);
}
