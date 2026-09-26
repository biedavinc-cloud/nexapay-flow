import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Ensure a single React/ReactDOM instance across the optimized dep graph
  // (prevents "Cannot read properties of null (reading 'useState')" from a
  // duplicate/stale copy and forces a clean re-optimization of the dep cache).
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  plugins: [
    base44({
      // Support for legacy code that imports the base44 SDK with @/integrations, @/entities, etc.
      // can be removed if the code has been updated to use the new SDK imports from @base44/sdk
      legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true',
      // All four below are Base44 hosted-editor/dev-environment integrations
      // (HMR bridge, visual drag-and-drop editing, navigation + analytics
      // reporting back to the Base44 dashboard). They inject scripts that
      // assume this page is running inside Base44's own hosting/iframe --
      // which it isn't on Cloudflare Pages. Left on, they cause: a stray
      // POST to /api/app-logs/.../log-user-in-app on every route change
      // (relative URL, always same-origin, always 405 here), and likely the
      // "loads but never renders" symptom if visualEditAgent hangs waiting
      // for a parent-frame handshake that will never arrive in production.
      hmrNotifier: false,
      navigationNotifier: false,
      analyticsTracker: false,
      visualEditAgent: false
    }),
    react(),
  ]
});