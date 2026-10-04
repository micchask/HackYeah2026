// Stan aplikacji (plan: docs/plan-frontend-claude.md §3). Czysta logika bez Reacta - łatwa do testów.
import {
  PROFILE_PRESETS,
  type LatLon,
  type RoutePreferences,
  type RouteResponse,
  type SearchResult,
} from '../api/client'
import type { NamedPoint, PickTarget } from '../components/RoutePoints'
import type { SelectedPlace } from './selectedPlace'

export type ProfileId = 'wheelchair' | 'senior' | 'tourist' | 'stroller' | 'guest'

export type LayerId =
  | 'barriers'
  | 'health'
  | 'institutions'
  | 'places'
  | 'reports' // dane z backendu
  | 'rest'
  | 'parking'
  | 'events' // dane przykładowe (§5.8)
  | 'gaps' // braki danych o dostępności (#31)

export type Layers = Record<LayerId, boolean>

export type PanelState =
  | { kind: 'explore' } // „Dla Ciebie”
  | { kind: 'route' } // A/B, warianty, opis
  | { kind: 'place'; place: SelectedPlace } // karta miejsca
  | { kind: 'report'; point: NamedPoint | null } // zgłoszenie

export interface AppState {
  profile: ProfileId | null // null = pokaż StartScreen
  prefs: RoutePreferences
  customized: boolean
  layers: Layers
  panel: PanelState
  history: PanelState[]
  origin: NamedPoint | null
  destination: NamedPoint | null
  route: RouteResponse | null
  routeLoading: boolean
  routeError: string | null
  variant: number
  segment: number | null
  settingsOpen: boolean
  // Mapa: wskazywanie punktu kliknięciem, zaznaczony obiekt, widoczny obszar
  pickTarget: PickTarget | null
  reportPoint: NamedPoint | null
  mapSelection: SelectedPlace | null
  selectedBarrier: string | null
  mapBbox: string | null
  mapCenter: LatLon | null
  placesQuery: string
  /** „Pokaż wszystkie na mapie” dla zapytania o rodzaj/cechę („hotel”, „przewijak”) */
  resultSet: { query: string; results: SearchResult[] } | null
  /** Punkt, na który mapa ma się przesunąć (np. obszar z listy braków danych); seq = ponowny klik */
  mapFocus: { point: LatLon; seq: number } | null
}

const NO_LAYERS: Layers = {
  barriers: false,
  health: false,
  institutions: false,
  places: false,
  reports: false,
  rest: false,
  parking: false,
  events: false,
  gaps: false,
}

function layers(...on: LayerId[]): Layers {
  return { ...NO_LAYERS, ...Object.fromEntries(on.map((id) => [id, true])) }
}

// Zapas na wypadek braku backendu - preferencje trybu przychodzą z GET /api/profiles (#87),
// patrz chooseProfile. Wartości jak w planie §4.
// `places` i `reports` są włączone wszędzie, żeby po FE1 mapa wyglądała jak dotąd - warstwy porządkuje #90.
const WALK: RoutePreferences = {
  profile: 'walk',
  avoid_stairs: false,
  max_incline_percent: 30,
  max_kerb_height_cm: 30,
  avoid_rough_surface: false,
  prefer_lit_paths: false,
}

export const PROFILE_DEFAULTS: Record<ProfileId, { prefs: RoutePreferences; layers: Layers }> = {
  wheelchair: {
    prefs: PROFILE_PRESETS.wheelchair.preferences,
    layers: layers('barriers', 'health', 'institutions', 'parking', 'places', 'reports'),
  },
  senior: {
    prefs: {
      profile: 'senior',
      avoid_stairs: true,
      max_incline_percent: 8,
      max_kerb_height_cm: 5,
      avoid_rough_surface: true,
      prefer_lit_paths: false,
    },
    layers: layers('health', 'rest', 'institutions', 'places', 'reports'),
  },
  tourist: { prefs: WALK, layers: layers('institutions', 'places', 'events') },
  stroller: {
    prefs: PROFILE_PRESETS.stroller.preferences,
    layers: layers('barriers', 'health', 'rest', 'places', 'reports'),
  },
  guest: { prefs: WALK, layers: layers('institutions', 'places') },
}

export type Action =
  // akcje z planu §3
  /** prefs z GET /api/profiles; bez nich (backend niedostępny) - PROFILE_DEFAULTS */
  | { type: 'chooseProfile'; profile: ProfileId; prefs?: RoutePreferences }
  | { type: 'resetProfile' }
  | { type: 'setPrefs'; prefs: RoutePreferences }
  | { type: 'toggleLayer'; layer: LayerId; on?: boolean; customized?: boolean }
  | { type: 'openPanel'; panel: PanelState }
  | { type: 'back' }
  | { type: 'setOrigin'; point: NamedPoint | null }
  | { type: 'setDestination'; point: NamedPoint | null }
  | { type: 'setRoute'; route: RouteResponse | null; error?: string | null }
  | { type: 'setVariant'; variant: number }
  | { type: 'setSegment'; segment: number | null }
  | { type: 'openSettings' }
  | { type: 'closeSettings' }
  // dodatkowe akcje FE1 (przeniesione z dawnego HomePage)
  | { type: 'swapPoints' }
  | { type: 'routeLoading' }
  | { type: 'setPickTarget'; target: PickTarget | null }
  | { type: 'setReportPoint'; point: NamedPoint | null }
  | { type: 'selectOnMap'; selection: SelectedPlace | null }
  | { type: 'selectBarrier'; id: string | null }
  | { type: 'setMapView'; bbox: string; center: LatLon }
  | { type: 'setPlacesQuery'; query: string }
  | { type: 'showResults'; query: string; results: SearchResult[] }
  | { type: 'clearResults' }
  | { type: 'focusMap'; point: LatLon }
  /** Adres z geokodera zamiast współrzędnych - tylko jeśli punkt to nadal ten kliknięty */
  | { type: 'refinePoint'; target: PickTarget; expected: NamedPoint; point: NamedPoint }

export function initialState(saved: Partial<AppState> = {}): AppState {
  // Bez zapisanego trybu: null = ekran wyboru trybu. Do czasu wyboru - ustawienia „bez profilu”
  const profile = saved.profile ?? null
  const defaults = PROFILE_DEFAULTS[profile ?? 'guest']
  return {
    profile,
    prefs: saved.prefs ?? defaults.prefs,
    customized: saved.customized ?? false,
    layers: { ...defaults.layers, ...saved.layers },
    panel: { kind: 'explore' },
    history: [],
    origin: null,
    destination: null,
    route: null,
    routeLoading: false,
    routeError: null,
    variant: 0,
    segment: null,
    settingsOpen: false,
    pickTarget: null,
    reportPoint: null,
    mapSelection: null,
    selectedBarrier: null,
    mapBbox: null,
    mapCenter: null,
    placesQuery: '',
    resultSet: null,
    mapFocus: null,
  }
}

function open(state: AppState, panel: PanelState): AppState {
  if (state.panel.kind === panel.kind && panel.kind !== 'place') return { ...state, panel }
  return { ...state, panel, history: [...state.history, state.panel] }
}

// Po ustawieniu obu punktów panel przechodzi do trasy (jak „Trasa” w mapach Google)
function withPoints(state: AppState): AppState {
  if (state.origin && state.destination && state.panel.kind !== 'route') {
    return open(state, { kind: 'route' })
  }
  return state
}

export function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'chooseProfile': {
      const defaults = PROFILE_DEFAULTS[action.profile]
      return {
        ...state,
        profile: action.profile,
        prefs: action.prefs ?? defaults.prefs,
        layers: defaults.layers,
        customized: false,
        // Po wyborze trybu zaczynamy od „Dla Ciebie” (plan §5.1)
        panel: { kind: 'explore' },
        history: [],
      }
    }
    case 'resetProfile':
      return { ...state, profile: null, settingsOpen: false }
    case 'setPrefs':
      return { ...state, prefs: action.prefs, customized: true }
    case 'toggleLayer': {
      const on = action.on ?? !state.layers[action.layer]
      return {
        ...state,
        layers: { ...state.layers, [action.layer]: on },
        customized: action.customized ? true : state.customized,
      }
    }
    case 'openPanel':
      return open(state, action.panel)
    case 'back': {
      const previous = state.history.at(-1)
      if (!previous) return { ...state, panel: { kind: 'explore' } }
      return { ...state, panel: previous, history: state.history.slice(0, -1) }
    }
    case 'setOrigin':
      return withPoints({ ...state, origin: action.point })
    case 'setDestination':
      return withPoints({ ...state, destination: action.point })
    case 'swapPoints':
      return { ...state, origin: state.destination, destination: state.origin }
    case 'routeLoading':
      return { ...state, routeLoading: true, routeError: null }
    case 'setRoute':
      return {
        ...state,
        route: action.route,
        routeError: action.error ?? null,
        routeLoading: false,
        variant: 0,
        segment: null,
      }
    case 'setVariant':
      return { ...state, variant: action.variant, segment: null }
    case 'setSegment':
      return { ...state, segment: action.segment }
    case 'openSettings':
      return { ...state, settingsOpen: true }
    case 'closeSettings':
      return { ...state, settingsOpen: false }
    case 'setPickTarget':
      return { ...state, pickTarget: action.target }
    case 'setReportPoint':
      return { ...state, reportPoint: action.point }
    case 'selectOnMap':
      return { ...state, mapSelection: action.selection }
    case 'selectBarrier':
      return { ...state, selectedBarrier: action.id }
    case 'setMapView':
      return { ...state, mapBbox: action.bbox, mapCenter: action.center }
    case 'setPlacesQuery':
      return { ...state, placesQuery: action.query }
    case 'focusMap':
      return { ...state, mapFocus: { point: action.point, seq: (state.mapFocus?.seq ?? 0) + 1 } }
    case 'showResults':
      // nowy zestaw wyników zastępuje poprzedni i zamyka okienko poprzedniego miejsca
      return {
        ...state,
        resultSet: { query: action.query, results: action.results },
        mapSelection: null,
      }
    case 'clearResults':
      return { ...state, resultSet: null }
    case 'refinePoint': {
      const key = action.target === 'report' ? 'reportPoint' : action.target
      return state[key] === action.expected ? { ...state, [key]: action.point } : state
    }
  }
}

// --- zapamiętywanie w przeglądarce (bez lokalizacji - prywatność) -------------------------

export const STORAGE_KEY = 'kbb.app.v1'
export type Saved = Pick<AppState, 'profile' | 'prefs' | 'customized' | 'layers'>

export function loadSaved(storage: Pick<Storage, 'getItem'> | null): Partial<AppState> {
  try {
    const raw = storage?.getItem(STORAGE_KEY)
    if (!raw) return {}
    const saved = JSON.parse(raw) as Partial<Saved>
    if (saved.profile && !(saved.profile in PROFILE_DEFAULTS)) return {}
    return saved
  } catch {
    return {}
  }
}

export function saveState(storage: Pick<Storage, 'setItem'> | null, state: Saved): void {
  // Wybieramy pola wprost - nawet przekazany cały stan nie zapisze punktów trasy
  const { profile, prefs, customized, layers } = state
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify({ profile, prefs, customized, layers }))
  } catch {
    // tryb prywatny / zablokowane dane strony: aplikacja działa bez zapamiętywania
  }
}
