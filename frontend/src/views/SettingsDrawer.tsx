import { useEffect, useId, useRef, type KeyboardEvent } from 'react'
import type { RoutePreferences } from '../api/client'
import { useApp } from '../app/context'
import { MODE_META, MODE_ORDER } from '../app/modeMeta'
import type { LayerId, Layers, ProfileId } from '../app/state'
import { SoonTag } from '../components/EmptyState'
import { CloseIcon } from '../components/icons'
import { findMode, useModes } from '../app/useModes'

interface LayerOption {
  id: LayerId
  label: string
  description?: string
  /** Warstwa jest w stanie, ale jej danych nie ma jeszcze na mapie (#96) */
  soon?: boolean
}

const MAP_LAYERS: LayerOption[] = [
  { id: 'health', label: 'Toalety i zdrowie' },
  { id: 'places', label: 'Jedzenie i kultura' },
  { id: 'institutions', label: 'Urzędy i instytucje' },
  { id: 'barriers', label: 'Bariery na mapie' },
  { id: 'parking', label: 'Parkingi dla OzN', soon: true },
  { id: 'events', label: 'Wydarzenia', soon: true },
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
        checked={value.avoid_stairs}
        onChange={(checked) => set({ avoid_stairs: checked })}
      />
      <SwitchRow
        label="Omijaj bruk i nierówną nawierzchnię"
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
          Obniżony ok. 2 cm, zwykły ok. 10 cm.
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
  soon?: boolean
}

export function SwitchRow({ label, description, checked, onChange, soon }: SwitchRowProps) {
  return (
    <label className={soon ? 'settings-option settings-option-soon' : 'settings-option'}>
      <span className="settings-option-copy">
        <span className="settings-option-label">
          {label} {soon && <SoonTag />}
        </span>
        {description && <span className="settings-option-description">{description}</span>}
      </span>
      <span className="settings-switch">
        <input
          type="checkbox"
          role="switch"
          checked={soon ? false : checked}
          aria-checked={soon ? false : checked}
          aria-label={label}
          disabled={soon}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span className="settings-switch-track" aria-hidden="true" />
      </span>
    </label>
  )
}

export interface SettingsDrawerViewProps {
  /** Aktywny profil - zmiana wczytuje jego preset */
  profile?: ProfileId | null
  onProfileChange?: (profile: ProfileId) => void
  prefs: RoutePreferences
  layers: Layers
  onPrefsChange: (prefs: RoutePreferences) => void
  onLayerChange: (layer: LayerId, on: boolean) => void
  onRestore: () => void
  onClose: () => void
}

/** Widok na propsach, niezależny od implementacji stanu aplikacji. */
export function SettingsDrawerView({
  profile = null,
  onProfileChange,
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
            <p className="settings-eyebrow">Własna personalizacja</p>
            <h2 id={headingId} ref={heading} tabIndex={-1}>
              Twoje ustawienia
            </h2>
          </div>
          <button type="button" className="settings-close" aria-label="Zamknij" onClick={close}>
            <CloseIcon size={20} />
          </button>
        </header>

        <div className="settings-content">
          {onProfileChange && (
            <fieldset className="settings-section settings-profiles">
              <legend>Profil</legend>
              <div className="settings-profile-chips">
                {MODE_ORDER.map((id) => {
                  const meta = MODE_META[id]
                  return (
                    <button
                      key={id}
                      type="button"
                      className="quick-chip"
                      aria-pressed={profile === id}
                      onClick={() => onProfileChange(id)}
                    >
                      <meta.Icon size={16} />
                      {meta.short}
                    </button>
                  )
                })}
              </div>
            </fieldset>
          )}
          <fieldset className="settings-section">
            <legend>Ruch i trasy</legend>
            <PreferencesForm value={prefs} onChange={onPrefsChange} />
            <SwitchRow
              label="Pokazuj miejsca odpoczynku na trasie"
              checked={layers.rest}
              onChange={(on) => onLayerChange('rest', on)}
            />
          </fieldset>

          <fieldset className="settings-section">
            <legend>Miejsca i usługi</legend>
            {MAP_LAYERS.map((layer) => (
              <SwitchRow
                key={layer.id}
                label={layer.label}
                description={layer.description}
                checked={layers[layer.id]}
                soon={layer.soon}
                onChange={(on) => onLayerChange(layer.id, on)}
              />
            ))}
          </fieldset>

          <fieldset className="settings-section">
            <legend>Dane i widoczność</legend>
            <SwitchRow
              label="Pokazuj miejsca bez danych o dostępności"
              checked={layers.gaps}
              onChange={(on) => onLayerChange('gaps', on)}
            />
            <SwitchRow
              label="Pokazuj zgłoszenia użytkowników"
              checked={layers.reports}
              onChange={(on) => onLayerChange('reports', on)}
            />
            <SwitchRow
              label="Prowadź do dostępnego wejścia"
              checked={false}
              soon
              onChange={() => {}}
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
      profile={profile}
      onProfileChange={(id) =>
        dispatch({ type: 'chooseProfile', profile: id, prefs: findMode(modes, id)?.prefs })
      }
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
