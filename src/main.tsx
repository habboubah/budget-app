import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'motion/react';
// Bundled by Vite, never fetched: the app must look right offline.
import '@fontsource-variable/bricolage-grotesque/wght.css';
import App from './App.tsx';
import { applyDynamicType } from './dynamicType.ts';
import './index.css';

// Before the first render: the root font size is what the whole rem-based scale
// resolves against, so setting it afterwards would reflow the entire app.
applyDynamicType();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* "user" honours prefers-reduced-motion: transforms are dropped, opacity kept. */}
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </StrictMode>,
);
