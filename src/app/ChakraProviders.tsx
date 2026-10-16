'use client';

import React, { useState, useEffect } from 'react';
import {
  ChakraProvider,
  cookieStorageManager,
  cookieStorageManagerSSR,
} from '@chakra-ui/react';
import theme from '../theme/theme';

export default function ChakraProviders({
  children,
  cookieHeader,
}: {
  children: React.ReactNode;
  cookieHeader?: string;
}) {
  // On the server (and first client render), use the SSR cookie string so the
  // HTML matches.  After hydration, switch to the live client-side
  // cookieStorageManager so toggling dark mode is actually persisted and
  // re-read correctly on subsequent navigations.
  const [colorModeManager, setColorModeManager] = useState(() =>
    cookieHeader
      ? cookieStorageManagerSSR(cookieHeader)
      : cookieStorageManager,
  );

  useEffect(() => {
    // After hydration, always use the client-side manager that reads from
    // document.cookie directly, so it picks up any toggle the user made.
    setColorModeManager(cookieStorageManager);
  }, []);

  return (
    <ChakraProvider theme={theme} colorModeManager={colorModeManager}>
      {children}
    </ChakraProvider>
  );
}

