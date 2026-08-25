/**
 * Application Runtime Configuration
 *
 * Controls whether the application is running in local Demo Mode (using local browser storage)
 * or in production mode.
 */

// In Google AI Studio preview or when VITE_DEMO_MODE is true or not explicitly set to 'false',
// we default to demo mode with local storage persistence.
const rawDemoMode = (typeof import.meta !== 'undefined' && import.meta.env)
  ? (import.meta.env.VITE_DEMO_MODE as string | undefined)
  : undefined;

export const IS_DEMO_MODE: boolean =
  rawDemoMode === undefined ||
  rawDemoMode === 'true' ||
  rawDemoMode !== 'false';

export const APP_CONFIG = {
  isDemoMode: IS_DEMO_MODE,
  storageType: IS_DEMO_MODE ? 'localStorage' : 'api',
  appVersion: '1.0.0',
  defaultLanguage: 'ar',
} as const;
