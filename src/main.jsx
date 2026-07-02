import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { FeedbackProvider } from './contexts/FeedbackContext.jsx'
import { ErrorBoundary } from './components/system/ErrorBoundary.jsx'
import { RuntimeGate } from './components/system/RuntimeGate.jsx'
import './styles.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <RuntimeGate>
        <BrowserRouter>
          <AuthProvider>
            <FeedbackProvider>
              <App />
            </FeedbackProvider>
          </AuthProvider>
        </BrowserRouter>
      </RuntimeGate>
    </ErrorBoundary>
  </React.StrictMode>,
)
