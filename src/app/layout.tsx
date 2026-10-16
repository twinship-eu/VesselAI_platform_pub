import React, { ReactNode } from 'react';
import { ColorModeScript } from '@chakra-ui/react';
import localFont from 'next/font/local';
import type { Metadata } from 'next';
import AppWrappers from './AppWrappers';
import theme from '../theme/theme';
import { headers } from 'next/headers';
import 'leaflet/dist/leaflet.css';

// Self-hosted from public/fonts/dm-sans (OFL). next/font/google fetched the
// same family from Google at BUILD time, so a build failed whenever the VM's
// Docker build could not get a usable answer from fonts.googleapis.com.
const dmSans = localFont({
  src: [
    { path: '../../public/fonts/dm-sans/DMSans-Regular.ttf', weight: '400', style: 'normal' },
    { path: '../../public/fonts/dm-sans/DMSans-Italic.ttf', weight: '400', style: 'italic' },
    { path: '../../public/fonts/dm-sans/DMSans-Medium.ttf', weight: '500', style: 'normal' },
    { path: '../../public/fonts/dm-sans/DMSans-MediumItalic.ttf', weight: '500', style: 'italic' },
    { path: '../../public/fonts/dm-sans/DMSans-Bold.ttf', weight: '700', style: 'normal' },
    { path: '../../public/fonts/dm-sans/DMSans-BoldItalic.ttf', weight: '700', style: 'italic' },
  ],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'VesselAI Platform',
    template: '%s | VesselAI',
  },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const h = await headers();
  // Provide cookie header to Chakra so it can SSR the same color mode as the client.
  const cookieHeader = h.get('cookie') ?? '';
  // F12: middleware.ts mints a per-request CSP nonce and puts it on x-nonce.
  // Chakra's ColorModeScript below is a raw inline <script> that runs before
  // first paint to avoid a light/dark flash; Next.js cannot nonce it because
  // Chakra renders it itself. Under the strict report-only policy it was the
  // single violation reported, on every page. Passing the nonce fixes it at the
  // source instead of weakening script-src back to 'unsafe-inline'.
  const nonce = h.get('x-nonce') ?? undefined;
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body id={'root'} className={dmSans.className}>
        <ColorModeScript
          nonce={nonce}
          initialColorMode={(theme as any).config?.initialColorMode}
          type="cookie"
        />
        <AppWrappers cookieHeader={cookieHeader}>{children}</AppWrappers>
      </body>
    </html>
  );
}
