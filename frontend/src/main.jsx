import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import ESP32OTADashboard from './ESP32OTADashboard'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ESP32OTADashboard />
  </StrictMode>,
)