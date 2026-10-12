import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { SplashWindowView } from './components/SplashWindowView';
import './index.css';
import './studio.css';
import './launchpad.css';
import './content.css';
import './interface.css';
import './gallery.css';
import { MotionProvider } from './components/MotionProvider';
import { LauncherErrorBoundary } from './components/LauncherErrorBoundary';

// Decorative images and links must not export themselves through native drag-and-drop.
document.addEventListener('dragstart', event => {
  if (event.target instanceof Element && event.target.closest('img, a, video, canvas')) event.preventDefault();
});
// An external file dropped outside an import view must never navigate the renderer.
for (const type of ['dragover', 'drop']) {
  document.addEventListener(type, event => {
    if ((event as DragEvent).dataTransfer?.types.includes('Files')) event.preventDefault();
  });
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <LauncherErrorBoundary><MotionProvider>{new URLSearchParams(window.location.search).get('view') === 'splash' ? <SplashWindowView /> : <App />}</MotionProvider></LauncherErrorBoundary>
  </React.StrictMode>
);
