import { HomePage } from './pages/HomePage'

export default function App() {
  return (
    <>
      <a href="#main" className="skip-link">
        Przejdź do treści
      </a>
      <main id="main" tabIndex={-1}>
        <h1 className="visually-hidden">Kraków bez Barier – dostępne trasy i miejsca</h1>
        <HomePage />
      </main>
    </>
  )
}
