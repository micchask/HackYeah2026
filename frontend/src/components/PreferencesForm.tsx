import type { RoutePreferences } from '../api/client'

interface Props {
  value: RoutePreferences
  onChange: (value: RoutePreferences) => void
}

/** Pytamy o potrzeby dotyczące trasy, nigdy o niepełnosprawność. */
export function PreferencesForm({ value, onChange }: Props) {
  const set = (patch: Partial<RoutePreferences>) => onChange({ ...value, ...patch })

  return (
    <fieldset>
      <legend>Preferencje trasy</legend>
      <label>
        <input
          type="checkbox"
          checked={value.avoid_stairs}
          onChange={(e) => set({ avoid_stairs: e.target.checked })}
        />
        Omijaj schody
      </label>
      <label>
        <input
          type="checkbox"
          checked={value.avoid_rough_surface}
          onChange={(e) => set({ avoid_rough_surface: e.target.checked })}
        />
        Omijaj nierówną nawierzchnię (kostka, bruk, żwir)
      </label>
      <label htmlFor="max-incline">Maksymalne nachylenie: {value.max_incline_percent}%</label>
      <input
        id="max-incline"
        type="range"
        min={0}
        max={15}
        step={1}
        value={value.max_incline_percent}
        onChange={(e) => set({ max_incline_percent: Number(e.target.value) })}
      />
    </fieldset>
  )
}
