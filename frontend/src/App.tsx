import { LogoMark } from './components/icons'
import { HomePage } from './pages/HomePage'

export default function App() {
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
        <p className="header-note">
          <span className="badge badge-demo">demo</span> dane: OpenStreetMap
        </p>
      </header>
      <main id="main" tabIndex={-1}>
        <HomePage />
      </main>
    </>
  )
}
