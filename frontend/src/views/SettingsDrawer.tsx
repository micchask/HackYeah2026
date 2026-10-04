import { useEffect, useId, useRef, type KeyboardEvent } from 'react'
import type { RoutePreferences } from '../api/client'
import { useApp } from '../app/context'
import type { LayerId, Layers } from '../app/state'
import { findMode, useModes } from '../app/useModes'

interface LayerOption {
  id: LayerId
  label: string
  description: string
}

const MAP_LAYERS: LayerOption[] = [
  { id: 'barriers', label: 'Bariery', description: 'Schody, wysokie krawężniki i utrudnienia.' },
  { id: 'health', label: 'Toalety i zdrowie', description: 'Toalety, apteki i placówki zdrowia.' },
  { id: 'institutions', label: 'Instytucje', description: 'Urzędy i obiekty publiczne.' },
  { id: 'places', label: 'Jedzenie i kultura', description: 'Lokale, zabytki i miejsca kultury.' },
  {
    id: 'parking',
    label: 'Parkingi',
    description: 'Miejsca parkingowe dla osób z niepełnosprawnościami.',
  },
  { id: 'events', label: 'Wydarzenia', description: 'Nadchodzące wydarzenia w mieście.' },
]

interface PreferencesFormProps {
  value: RoutePreferences
  onChange: (value: RoutePreferences) => void
}

/** Ustawienia wpływające na wyznaczaną trasę. */
export function PreferencesForm({ value, onChange }: PreferencesFormProps) {
  const set = (patch: Partial<RoutePreferences>) => onChange({ ...value, ...patch })

  return (
    <>
      <SwitchRow
        label="Omijaj schody"
        description="Trasa nie będzie prowadzić po schodach."
        checked={value.avoid_stairs}
        onChange={(checked) => set({ avoid_stairs: checked })}
      />
      <SwitchRow
        label="Omijaj bruk i nierówną nawierzchnię"
        description="Preferuj gładkie chodniki zamiast kostki, bruku i żwiru."
        checked={value.avoid_rough_surface}
        onChange={(checked) => set({ avoid_rough_surface: checked })}
      />
      <div className="settings-range">
        <label htmlFor="settings-max-incline">
          Maksymalne nachylenie: <strong>{value.max_incline_percent}%</strong>
        </label>
        <input
          id="settings-max-incline"
          type="range"
          min={0}
          max={30}
          step={1}
          value={value.max_incline_percent}
          onChange={(event) => set({ max_incline_percent: Number(event.target.value) })}
        />
      </div>
      <div className="settings-range">
        <label htmlFor="settings-max-kerb">
          Maksymalna wysokość krawężnika: <strong>{value.max_kerb_height_cm} cm</strong>
        </label>
        <input
          id="settings-max-kerb"
          type="range"
          min={0}
          max={30}
          step={1}
          value={value.max_kerb_height_cm}
          aria-describedby="settings-max-kerb-hint"
          onChange={(event) => set({ max_kerb_height_cm: Number(event.target.value) })}
        />
        <p id="settings-max-kerb-hint" className="settings-hint">
          Obniżony krawężnik ma około 2 cm, zwykły około 10 cm.
        </p>
      </div>
    </>
  )
}

interface SwitchRowProps {
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
}

function SwitchRow({ label, description, checked, onChange }: SwitchRowProps) {
  return (
    <label className="settings-option">
      <span className="settings-option-copy">
        <span className="settings-option-label">{label}</span>
        {description && <span className="settings-option-description">{description}</span>}
      </span>
      <span className="settings-switch">
        <input
          type="checkbox"
          role="switch"
          checked={checked}
          aria-checked={checked}
          aria-label={label}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span className="settings-switch-track" aria-hidden="true" />
      </span>
    </label>
  )
}

export interface SettingsDrawerViewProps {
  prefs: RoutePreferences
  layers: Layers
  onPrefsChange: (prefs: RoutePreferences) => void
  onLayerChange: (layer: LayerId, on: boolean) => void
  onRestore: () => void
  onClose: () => void
}

/** Widok na propsach, niezależny od implementacji stanu aplikacji. */
export function SettingsDrawerView({
  prefs,
  layers,
  onPrefsChange,
  onLayerChange,
  onRestore,
  onClose,
}: SettingsDrawerViewProps) {
  const headingId = useId()
  const dialog = useRef<HTMLDialogElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    heading.current?.focus()
  }, [])

  const close = () => {
    onClose()
    requestAnimationFrame(() => document.getElementById('profile-chip')?.focus())
  }

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
      return
    }
    if (event.key !== 'Tab' || !dialog.current) return

    const focusable = Array.from(
      dialog.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => !element.hasAttribute('hidden'))
    const first = focusable[0]
    const last = focusable.at(-1)
    const active = document.activeElement

    if (event.shiftKey && (active === first || active === heading.current)) {
      event.preventDefault()
      last?.focus()
    } else if (!event.shiftKey && active === last) {
      event.preventDefault()
      first?.focus()
    }
  }

  return (
    <div className="settings-backdrop">
      <dialog
        ref={dialog}
        open
        aria-modal="true"
        aria-labelledby={headingId}
        className="settings-drawer"
        onKeyDown={onKeyDown}
      >
        <header className="settings-header">
          <div>
            <p className="settings-eyebrow">Dostosuj tryb</p>
            <h2 id={headingId} ref={heading} tabIndex={-1}>
              Twoje ustawienia
            </h2>
          </div>
          <button type="button" className="settings-close" aria-label="Zamknij" onClick={close}>
            ×
          </button>
        </header>

        <div className="settings-content">
          <fieldset className="settings-section">
            <legend>Ruch i trasy</legend>
            <PreferencesForm value={prefs} onChange={onPrefsChange} />
            <SwitchRow
              label="Pokazuj miejsca odpoczynku na trasie"
              description="Ławki i inne miejsca, w których można zrobić przerwę."
              checked={layers.rest}
              onChange={(on) => onLayerChange('rest', on)}
            />
          </fieldset>

          <fieldset className="settings-section">
            <legend>Na mapie</legend>
            {MAP_LAYERS.map((layer) => (
              <SwitchRow
                key={layer.id}
                label={layer.label}
                description={layer.description}
                checked={layers[layer.id]}
                onChange={(on) => onLayerChange(layer.id, on)}
              />
            ))}
          </fieldset>

          <fieldset className="settings-section">
            <legend>Dane</legend>
            <SwitchRow
              label="Pokazuj miejsca bez danych o dostępności"
              description="Pomaga znaleźć obszary, które wymagają uzupełnienia informacji."
              checked={layers.gaps}
              onChange={(on) => onLayerChange('gaps', on)}
            />
            <SwitchRow
              label="Pokazuj zgłoszenia użytkowników"
              description="Aktualne utrudnienia zgłoszone przez społeczność."
              checked={layers.reports}
              onChange={(on) => onLayerChange('reports', on)}
            />
          </fieldset>
        </div>

        <footer className="settings-actions">
          <button type="button" className="settings-restore" onClick={onRestore}>
            Przywróć ustawienia trybu
          </button>
          <button type="button" className="primary-button" onClick={close}>
            Zamknij
          </button>
        </footer>
      </dialog>
    </div>
  )
}

/** Adapter do akcji z AppState; widok pozostaje testowalny niezależnie od kontekstu. */
export function SettingsDrawer() {
  const [{ settingsOpen, prefs, layers, profile }, dispatch] = useApp()
  const modes = useModes()
  if (!settingsOpen) return null

  return (
    <SettingsDrawerView
      prefs={prefs}
      layers={layers}
      onPrefsChange={(value) => dispatch({ type: 'setPrefs', prefs: value })}
      onLayerChange={(layer, on) => dispatch({ type: 'toggleLayer', layer, on, customized: true })}
      onRestore={() => {
        const activeProfile = profile ?? 'guest'
        dispatch({
          type: 'chooseProfile',
          profile: activeProfile,
          prefs: findMode(modes, activeProfile)?.prefs,
        })
      }}
      onClose={() => dispatch({ type: 'closeSettings' })}
    />
  )
}
