// src/main.jsx
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom' // Fixed import
import { ThemeProvider } from './contexts/ThemeContext';

// ✅ StrictMode is disabled for production performance
// In dev, it causes double renders. Enable it only when debugging React issues.
createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </BrowserRouter>,
)