import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { SplashWindowView } from './components/SplashWindowView';
import './index.css';
import './studio.css';
import './launchpad.css';
import { MotionProvider } from './components/MotionProvider';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <MotionProvider>{new URLSearchParams(window.location.search).get('view') === 'splash' ? <SplashWindowView /> : <App />}</MotionProvider>
  </React.StrictMode>
);
