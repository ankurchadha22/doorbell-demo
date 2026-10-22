import '@fontsource-variable/inter'
import '@fontsource-variable/jetbrains-mono'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, MemoryRouter } from 'react-router'
import App from './App'
import { FitToScreen } from './components/FitToScreen'
import './index.css'
import { isShareBuild } from './lib/share'
import { DemoProvider } from './presenter/DemoProvider'

// Hash URLs locally (deep links work); in-memory routing in the shared build, where the host owns the URL.
const Router = isShareBuild ? MemoryRouter : HashRouter

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <DemoProvider>
        <FitToScreen>
          <App />
        </FitToScreen>
      </DemoProvider>
    </Router>
  </StrictMode>,
)
