import { HomePage } from './pages/HomePage'

export default function App() {
  return (
    <>
      <a href="#main" className="skip-link">
        Przejdź do treści
      </a>
      <header className="header">
        <h1>Dostępne trasy – Kraków</h1>
      </header>
      <main id="main" tabIndex={-1}>
        <HomePage />
      </main>
    </>
  )
}
