import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import NeuralNetworkBackground from './components/NeuralNetworkBackground'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <NeuralNetworkBackground />
    <App />
  </StrictMode>,
)
