import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import Admin from './Admin.tsx'
import Privacy from './Privacy.tsx'
import Terms from './Terms.tsx'

function normalizePath(pathname: string) {
  const p = pathname.replace(/\/+$/, '')
  return p === '' ? '/' : p
}

function Root() {
  const [path, setPath] = useState(() => normalizePath(window.location.pathname))

  useEffect(() => {
    const onPop = () => setPath(normalizePath(window.location.pathname))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  if (path === '/privacy') return <Privacy />
  if (path === '/terms') return <Terms />
  if (path === '/admin' || path === '/admin/waitlist') return <Admin />
  return <App />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
