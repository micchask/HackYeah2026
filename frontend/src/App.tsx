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
      {dashboard ? (
        <div className="page">
          {/* Mapa jest pełnoekranowa bez nagłówka; dashboard ma cienki pasek z powrotem do mapy */}
          <header className="page-header">
            <a href="#/" className="page-brand">
              <LogoMark size={30} />
              <h1>Kraków bez Barier</h1>
            </a>
            <nav className="page-nav" aria-label="Widoki">
              <a href="#/">Mapa</a>
              <a href={DASHBOARD_HASH} aria-current="page">
                Dashboard miasta
              </a>
            </nav>
          </header>
          <main id="main" tabIndex={-1}>
            <DashboardPage />
          </main>
        </div>
      ) : (
        <main id="main" tabIndex={-1}>
          <h1 className="visually-hidden">Kraków bez Barier – dostępne trasy i miejsca</h1>
          <HomePage />
        </main>
      )}
    </>
  )
}
