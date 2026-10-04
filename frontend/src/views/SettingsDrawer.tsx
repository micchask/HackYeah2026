// Personalizacja „Dostosuj” (plan §5.7) - zrobi #94. Szkielet (zwykła sekcja; prawdziwy <dialog> z fokusem w zadaniu): otwiera się akcją openSettings.
import { useApp } from '../app/context'
import { PreferencesForm } from '../components/PreferencesForm'

export function SettingsDrawer() {
  const [{ settingsOpen, prefs }, dispatch] = useApp()
  if (!settingsOpen) return null
  return (
    <section aria-labelledby="settings-heading" className="card">
      <h2 id="settings-heading">Dostosuj</h2>
      <PreferencesForm
        value={prefs}
        onChange={(value) => dispatch({ type: 'setPrefs', prefs: value })}
      />
      <button type="button" onClick={() => dispatch({ type: 'closeSettings' })}>
        Zamknij
      </button>
    </section>
  )
}
