import { useSyncExternalStore } from 'react'
import { LogoMark } from './components/icons'
import { DashboardPage } from './pages/DashboardPage'
import { HomePage } from './pages/HomePage'

// Routing na hashu (bez biblioteki): #/miasto = dashboard, cała reszta (też #main
// z linku "Przejdź do treści") = mapa
const DASHBOARD_HASH = '#/miasto'

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

function useIsDashboard(): boolean {
  return useSyncExternalStore(subscribe, () => window.location.hash === DASHBOARD_HASH)
}

export default function App() {
  const dashboard = useIsDashboard()
  return (
    <>
      <a href="#main" className="skip-link">
        Przejdź do treści
      </a>
      <header className="header">
        <div className="brand">
          <LogoMark size={34} />
          <div>
            <h1>Dostępne trasy</h1>
            <p className="brand-sub">Kraków · Stare Miasto, Wawel, Kazimierz</p>
          </div>
        </div>
        <nav className="header-nav" aria-label="Widoki">
          <a href="#/" aria-current={dashboard ? undefined : 'page'}>
            Mapa
          </a>
          <a href={DASHBOARD_HASH} aria-current={dashboard ? 'page' : undefined}>
            Dashboard miasta
          </a>
        </nav>
        <p className="header-note">
          <span className="badge badge-demo">demo</span> dane: OpenStreetMap
        </p>
      </header>
      <main id="main" tabIndex={-1}>
        {dashboard ? <DashboardPage /> : <HomePage />}
      </main>
    </>
  )
}
