import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { LedProvider } from './ledStore'
import { FeedbackProvider } from './feedback'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LedProvider>
      <FeedbackProvider>
        <App />
      </FeedbackProvider>
    </LedProvider>
  </React.StrictMode>,
)
