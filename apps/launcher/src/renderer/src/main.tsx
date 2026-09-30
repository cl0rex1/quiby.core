import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { SplashWindowView } from './components/SplashWindowView';
import './index.css';
import './studio.css';
import './launchpad.css';
import { MotionProvider } from './components/MotionProvider';

// Decorative images and links must not export themselves through native drag-and-drop.
document.addEventListener('dragstart', event => {
  if (event.target instanceof Element && event.target.closest('img, a, video, canvas')) event.preventDefault();
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <MotionProvider>{new URLSearchParams(window.location.search).get('view') === 'splash' ? <SplashWindowView /> : <App />}</MotionProvider>
  </React.StrictMode>
);
