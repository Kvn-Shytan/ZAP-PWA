import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { SyncProvider } from './contexts/SyncContext.jsx'; // Import SyncProvider

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SyncProvider> {/* Wrap App with SyncProvider */}
          <App />
        </SyncProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
