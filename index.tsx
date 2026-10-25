console.log('[index.tsx] Module loading...');

import React from 'react';
import ReactDOM from 'react-dom/client';

console.log('[index.tsx] React imported, now importing App...');

import App from './App';
import { reloadForNewVersion } from './components/chunkReload';

// A code file that fails to preload after a new deploy: reload once to get the new version
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  reloadForNewVersion((event as Event & { payload?: unknown }).payload).catch(() => {});
});

console.log('[index.tsx] All imports successful');

// If a screen fails to load (e.g. no connection), show a message with a reload button instead of a blank page
class LoadErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.error('[LoadErrorBoundary]', error);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, background: '#020617', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif', textAlign: 'center' }}>
        <p style={{ fontSize: 18, fontWeight: 600 }}>This screen could not be loaded.</p>
        <p style={{ fontSize: 14, color: '#94a3b8' }}>Check your internet connection, then reload.</p>
        <button onClick={() => window.location.reload()}
          style={{ padding: '10px 20px', borderRadius: 12, border: 'none', background: '#4f46e5', color: 'white', fontWeight: 700, fontSize: 15 }}>
          Reload
        </button>
      </div>
    );
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  const error = new Error("Could not find root element to mount to");
  console.error('[index.tsx]', error);
  throw error;
}

console.log('[index.tsx] Root element found, creating root...');

try {
  const root = ReactDOM.createRoot(rootElement);
  console.log('[index.tsx] Root created, rendering App...');
  root.render(
    <React.StrictMode>
      <LoadErrorBoundary>
        <App />
      </LoadErrorBoundary>
    </React.StrictMode>
  );
  console.log('[index.tsx] App rendered successfully!');
} catch (error) {
  console.error('[index.tsx] Error mounting React app:', error);
  if (error instanceof Error) {
    console.error('[index.tsx] Error stack:', error.stack);
  }
  rootElement.innerHTML = `
    <div style="padding: 20px; color: white; font-family: monospace;">
      <h1 style="color: #ef4444;">Error Loading App</h1>
      <p><strong>Error:</strong> ${error instanceof Error ? error.message : String(error)}</p>
      <p style="font-size: 12px; color: #64748b; margin-top: 20px;">
        Check the browser console (F12) for more details.
      </p>
      ${error instanceof Error && error.stack ? `
        <details style="margin-top: 10px;">
          <summary style="cursor: pointer; color: #94a3b8;">Stack Trace</summary>
          <pre style="background: #1e293b; padding: 10px; border-radius: 4px; overflow: auto; font-size: 11px; margin-top: 10px;">${error.stack}</pre>
        </details>
      ` : ''}
    </div>
  `;
}