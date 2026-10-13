import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { AppProviders } from '../components/AppProviders';
import './globals.css';
import { themeBootstrapScript, themeStyle } from './theme-style';

export const metadata: Metadata = {
  title: {
    default: 'Ncanny',
    template: '%s · Ncanny',
  },
  description:
    'Ncanny is the academic social platform where Scholars create, Preceptors guide, and learning is worth sharing.',
  applicationName: 'Ncanny',
  // Student work is private by default; search engines must not index the app.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Zoom stays enabled: disabling it fails WCAG 1.4.4.
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: themeStyle }} />
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body className="min-h-screen bg-surface font-sans text-content">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
