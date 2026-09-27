'use client';

import { useEffect } from 'react';
import OneSignal from 'react-onesignal';

import { createClient } from '@/lib/supabase/client';

/**
 * Links the authenticated Supabase user to their OneSignal subscription.
 * Call this hook once inside a client component that renders after login
 * (e.g. the OneSignalProvider wrapper in layout.tsx).
 */
export function useOneSignalAuth() {
  useEffect(() => {
    async function linkUser() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        // Link the Supabase UUID as the OneSignal external user ID
        await OneSignal.login(user.id);
      } catch (err) {
        console.error('[useOneSignalAuth] Failed to link user:', err);
      }
    }

    linkUser();
  }, []);
}
