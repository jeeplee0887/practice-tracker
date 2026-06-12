import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { requestPersistentStorage } from './hooks/useStorage.ts';
import './index.css';

// Ask the browser to protect practice data from eviction.
void requestPersistentStorage();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename="/practice-tracker">
      <App />
    </BrowserRouter>
  </StrictMode>
);
