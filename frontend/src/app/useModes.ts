// Tryby z ekranu startowego: jedno źródło to GET /api/profiles (#87), tu tylko cache i zapas offline.
import { useEffect, useState } from 'react'
import { api, type ModePreset, type RoutePreferences } from '../api/client'
import { PROFILE_DEFAULTS, type ProfileId } from './state'

export interface ModeInfo {
  id: ProfileId
  label: string
  description: string
  icon: string
  prefs: RoutePreferences
}

// Gdy backend nie odpowiada - te same teksty co w backend/app/api/profiles.py (plan §4)
const FALLBACK: ModeInfo[] = [
  {
    id: 'wheelchair',
    label: 'Poruszam się na wózku',
    description: 'Bez schodów, nachylenie do 6%, krawężnik do 2 cm, omija bruk i kocie łby.',
    icon: '♿',
    prefs: PROFILE_DEFAULTS.wheelchair.prefs,
  },
  {
    id: 'senior',
    label: 'Wolniejsze tempo, mniej podejść',
    description: 'Bez schodów, nachylenie do 8%, krawężnik do 5 cm, mniej bruku.',
    icon: '👴',
    prefs: PROFILE_DEFAULTS.senior.prefs,
  },
  {
    id: 'tourist',
    label: 'Zwiedzam miasto',
    description: 'Najkrótsza piesza trasa, schody dozwolone.',
    icon: '🧳',
    prefs: PROFILE_DEFAULTS.tourist.prefs,
  },
  {
    id: 'stroller',
    label: 'Jestem z wózkiem dziecięcym',
    description: 'Bez schodów, nachylenie do 10%, krótki bruk jest akceptowalny.',
    icon: '👶',
    prefs: PROFILE_DEFAULTS.stroller.prefs,
  },
  {
    id: 'guest',
    label: 'Bez profilu',
    description: 'Zwykła trasa piesza. Tryb możesz zmienić w każdej chwili.',
    icon: '👤',
    prefs: PROFILE_DEFAULTS.guest.prefs,
  },
]

function fromPreset(preset: ModePreset): ModeInfo {
  return {
    id: preset.id,
    label: preset.label,
    description: preset.description,
    icon: preset.icon,
    prefs: preset.preferences,
  }
}

let loading: Promise<ModeInfo[]> | null = null

function loadModes(): Promise<ModeInfo[]> {
  loading ??= api
    .profiles()
    .then((presets) => presets.map(fromPreset))
    .catch(() => {
      loading = null // spróbujemy ponownie przy następnym użyciu
      return FALLBACK
    })
  return loading
}

/** Dla testów: zapomina pobrane tryby. */
export function resetModesCache(): void {
  loading = null
}

/** Tryby od razu (zapas), po chwili podmienione na dane z backendu. */
export function useModes(): ModeInfo[] {
  const [modes, setModes] = useState<ModeInfo[]>(FALLBACK)
  useEffect(() => {
    let active = true
    void loadModes().then((loaded) => {
      if (active) setModes(loaded)
    })
    return () => {
      active = false
    }
  }, [])
  return modes
}

export function findMode(modes: ModeInfo[], id: ProfileId | null): ModeInfo | undefined {
  return modes.find((m) => m.id === id)
}
