'use client';

import { useEffect } from 'react';
import { initOneSignal } from '@/lib/onesignal';
import { useOneSignalAuth } from '@/hooks/use-onesignal-auth';

/**
 * Client component that initializes OneSignal and links the current user.
 * Drop this inside the server RootLayout — it renders nothing visible.
 *
 * <OneSignalProvider /> must be inside a ThemeProvider or any other
 * client boundary; it will NOT cause hydration issues because it runs
 * only in the browser.
 */
export function OneSignalProvider() {
  useEffect(() => {
    initOneSignal().catch((err) =>
      console.error('[OneSignalProvider] Init failed:', err)
    );
  }, []);

  // After init, link the authenticated user
  useOneSignalAuth();

  return null;
}
