// src/main.jsx
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom' // Fixed import
import { ThemeProvider } from './contexts/ThemeContext';
import { HelmetProvider } from 'react-helmet-async';
import React from 'react'          // ✅ add this

// ✅ StrictMode is disabled for production performance
// In dev, it causes double renders. Enable it only when debugging React issues.
createRoot(document.getElementById('root')).render(
  <HelmetProvider>
    <BrowserRouter>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </HelmetProvider>,
)