// Ekran wyboru trybu (plan §5.1) - zrobi #88. Szkielet (zwykła sekcja; prawdziwy <dialog> z fokusem w zadaniu): widoczny tylko po „Zmień tryb” (profil = null).
import { useApp } from '../app/context'
import type { ProfileId } from '../app/state'

const CHOICES: { id: ProfileId; label: string }[] = [
  { id: 'wheelchair', label: 'Poruszam się na wózku' },
  { id: 'senior', label: 'Wolniejsze tempo, mniej podejść' },
  { id: 'tourist', label: 'Zwiedzam miasto' },
  { id: 'stroller', label: 'Jestem z wózkiem dziecięcym' },
]

export function StartScreen() {
  const [{ profile }, dispatch] = useApp()
  if (profile !== null) return null
  const choose = (id: ProfileId) => dispatch({ type: 'chooseProfile', profile: id })
  return (
    <section aria-labelledby="start-screen-heading" className="card">
      <h2 id="start-screen-heading">Jak się poruszasz?</h2>
      {CHOICES.map((c) => (
        <button key={c.id} type="button" onClick={() => choose(c.id)}>
          {c.label}
        </button>
      ))}
      <button type="button" onClick={() => choose('guest')}>
        Kontynuuj bez profilu
      </button>
    </section>
  )
}
