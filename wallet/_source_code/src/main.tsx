import { Buffer } from 'buffer';

if (typeof (window as any).global === 'undefined') {
  (window as any).global = window;
}
(window as any).Buffer = (window as any).Buffer || Buffer;
(window as any).process = (window as any).process || { env: {} };

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
