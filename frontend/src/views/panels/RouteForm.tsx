// Punkty A/B + tryb + szczegóły. Tymczasowo wspólne dla „Dla Ciebie” i panelu trasy:
// tryb i preferencje przeniesie #88/#94 (chip + szuflada), „Dla Ciebie” dostanie chipy tras demo (#91).
import { CITY, useApp } from '../../app/context'
import { setPointAction } from '../../app/mapActions'
import { SlidersIcon } from '../../components/icons'
import { PreferencesForm } from '../../components/PreferencesForm'
import { ProfilePicker } from '../../components/ProfilePicker'
import { DEMO_ROUTES } from '../../app/demoRoutes'
import { RoutePoints } from '../../components/RoutePoints'

export function RouteForm() {
  const [state, dispatch] = useApp()
  const { origin, destination, pickTarget, prefs, routeError } = state
  return (
    <form
      className="card"
      onSubmit={(e) => e.preventDefault()}
      aria-describedby={routeError ? 'error' : undefined}
    >
      <RoutePoints
        city={CITY}
        origin={origin}
        destination={destination}
        presets={DEMO_ROUTES}
        pickTarget={pickTarget}
        onChange={(target, value) => {
          dispatch(setPointAction(target, value))
          dispatch({ type: 'setPickTarget', target: null })
        }}
        onPick={(target) => dispatch({ type: 'setPickTarget', target })}
        onPreset={(preset) => {
          dispatch({ type: 'setOrigin', point: preset.origin })
          dispatch({ type: 'setDestination', point: preset.destination })
          dispatch({ type: 'setPickTarget', target: null })
        }}
        onSwap={() => dispatch({ type: 'swapPoints' })}
      />
      <ProfilePicker
        value={prefs.profile}
        onChange={(id) => dispatch({ type: 'chooseProfile', profile: id })}
      />
      <details className="advanced">
        <summary>
          <SlidersIcon size={18} /> Dostosuj szczegóły
        </summary>
        <PreferencesForm
          value={prefs}
          onChange={(value) => dispatch({ type: 'setPrefs', prefs: value })}
        />
      </details>
    </form>
  )
}
