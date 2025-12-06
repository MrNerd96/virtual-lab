console.log('[index.tsx] Module loading...');

import React from 'react';
import ReactDOM from 'react-dom/client';

console.log('[index.tsx] React imported, now importing App...');

import App from './App';

console.log('[index.tsx] All imports successful');

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
      <App />
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