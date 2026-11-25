import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './here.css'
import AppWorkspace from './AppWorkspace.jsx'
import { SuccessFeedback } from './components/SuccessFeedback.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppWorkspace />
    <SuccessFeedback />
  </StrictMode>,
)
