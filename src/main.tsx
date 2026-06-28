import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { TaskProvider } from '@/context/TaskContext.tsx'
import { FocusProvider } from '@/context/FocusContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TaskProvider>
      <FocusProvider>
        <App />
      </FocusProvider>
    </TaskProvider>
  </StrictMode>,
)
