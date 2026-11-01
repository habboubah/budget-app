import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.habboubah.spartopf',
  appName: 'Spartopf',
  webDir: 'dist',
  ios: {
    // The page paints its own background under the status bar (safe-top), so
    // the web view must run edge to edge rather than being inset by iOS.
    contentInset: 'never',
  },
};

export default config;
