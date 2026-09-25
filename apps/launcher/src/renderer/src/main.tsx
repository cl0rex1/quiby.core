import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './studio.css';
import { MotionProvider } from './components/MotionProvider';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <MotionProvider><App /></MotionProvider>
  </React.StrictMode>
);
