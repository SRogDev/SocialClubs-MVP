/**
 * OneSignal SDK initializer (client-side only).
 * Call initOneSignal() once, then use the OneSignal object from react-onesignal.
 */

import OneSignal from 'react-onesignal';

let initialized = false;

export async function initOneSignal(): Promise<void> {
  if (initialized || typeof window === 'undefined') return;

  await OneSignal.init({
    appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID!,
    allowLocalhostAsSecureOrigin: true,
    serviceWorkerParam: { scope: '/push/onesignal/' },
    serviceWorkerPath: '/push/onesignal/OneSignalSDKWorker.js',
  });

  initialized = true;
}
