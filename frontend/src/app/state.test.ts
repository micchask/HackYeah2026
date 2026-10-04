import { describe, expect, it } from 'vitest'
import type { RouteResponse, SearchResult } from '../api/client'
import {
  appReducer,
  initialState,
  loadSaved,
  PROFILE_DEFAULTS,
  saveState,
  STORAGE_KEY,
  type AppState,
} from './state'

const A = { label: 'A', point: { lat: 50.06, lon: 19.93 } }
const B = { label: 'B', point: { lat: 50.05, lon: 19.94 } }

function run(state: AppState, ...actions: Parameters<typeof appReducer>[1][]) {
  return actions.reduce(appReducer, state)
}

describe('appReducer', () => {
  it('pierwsze wejście: bez trybu (ekran wyboru), do czasu wyboru ustawienia „bez profilu”', () => {
    const state = initialState()
    expect(state.profile).toBeNull()
    expect(state.prefs).toEqual(PROFILE_DEFAULTS.guest.prefs)
    expect(state.panel).toEqual({ kind: 'explore' })
  })

  it('zapamiętany tryb pomija ekran wyboru', () => {
    expect(initialState({ profile: 'wheelchair' }).profile).toBe('wheelchair')
  })

  it('wybór trybu bierze preferencje z /api/profiles, a bez nich - zapas z frontu', () => {
    const fromApi = { ...PROFILE_DEFAULTS.senior.prefs, max_kerb_height_cm: 4 }
    let state = run(initialState(), { type: 'chooseProfile', profile: 'senior', prefs: fromApi })
    expect(state.prefs).toEqual(fromApi)
    state = run(state, { type: 'chooseProfile', profile: 'wheelchair' })
    expect(state.prefs).toEqual(PROFILE_DEFAULTS.wheelchair.prefs)
  })

  it('wybór trybu wraca do panelu „Dla Ciebie”', () => {
    const state = run(
      initialState({ profile: 'wheelchair' }),
      { type: 'setOrigin', point: A },
      { type: 'setDestination', point: B },
      { type: 'resetProfile' },
      { type: 'chooseProfile', profile: 'stroller' },
    )
    expect(state.panel).toEqual({ kind: 'explore' })
    expect(state.history).toEqual([])
  })

  it('wybór trybu ustawia preferencje i warstwy, ręczna zmiana oznacza „dostosowany”', () => {
    let state = run(initialState(), { type: 'chooseProfile', profile: 'tourist' })
    expect(state.prefs.avoid_stairs).toBe(false)
    expect(state.layers.events).toBe(true)
    expect(state.customized).toBe(false)
    state = run(state, { type: 'setPrefs', prefs: { ...state.prefs, avoid_stairs: true } })
    expect(state.customized).toBe(true)
    state = run(state, { type: 'chooseProfile', profile: 'senior' })
    expect(state.customized).toBe(false)
  })

  it('„Zmień tryb” czyści profil (pokazuje ekran wyboru)', () => {
    expect(run(initialState(), { type: 'resetProfile' }).profile).toBeNull()
  })

  it('oba punkty otwierają panel trasy, „Wstecz” wraca do „Dla Ciebie”', () => {
    let state = run(
      initialState(),
      { type: 'setOrigin', point: A },
      { type: 'setDestination', point: B },
    )
    expect(state.panel).toEqual({ kind: 'route' })
    state = run(state, { type: 'back' })
    expect(state.panel).toEqual({ kind: 'explore' })
    expect(state.history).toEqual([])
  })

  it('nowa trasa zeruje wybrany wariant i odcinek', () => {
    const route = { segments: [] } as unknown as RouteResponse
    const state = run(
      initialState(),
      { type: 'setVariant', variant: 2 },
      { type: 'setSegment', segment: 3 },
      { type: 'routeLoading' },
      { type: 'setRoute', route },
    )
    expect(state).toMatchObject({ route, variant: 0, segment: null, routeLoading: false })
  })

  it('przełącza warstwę albo ustawia ją wprost', () => {
    const state = initialState()
    expect(run(state, { type: 'toggleLayer', layer: 'barriers' }).layers.barriers).toBe(
      !state.layers.barriers,
    )
    expect(run(state, { type: 'toggleLayer', layer: 'events', on: true }).layers.events).toBe(true)
  })

  it('adres z geokodera podmienia punkt tylko, jeśli nikt go w międzyczasie nie zmienił', () => {
    const better = { label: 'ul. Grodzka 1', point: A.point }
    let state = run(initialState(), { type: 'setOrigin', point: A })
    expect(
      run(state, { type: 'refinePoint', target: 'origin', expected: A, point: better }).origin,
    ).toBe(better)
    state = run(state, { type: 'setOrigin', point: B })
    expect(
      run(state, { type: 'refinePoint', target: 'origin', expected: A, point: better }).origin,
    ).toBe(B)
  })
})

describe('wszystkie wyniki zapytania o rodzaj („hotel”, „przewijak”)', () => {
  const hotel = (i: number): SearchResult => ({
    id: `place:h${i}`,
    source: 'place',
    match: 'category',
    label: `Hotel ${i}`,
    kind: 'hotel',
    point: { lat: 50.06, lon: 19.94 },
  })

  it('„Pokaż wszystkie” zapisuje wyniki i zamyka okienko poprzedniego miejsca, „Wyczyść” je usuwa', () => {
    const selected = run(initialState(), {
      type: 'selectOnMap',
      selection: { kind: 'search', result: hotel(9) },
    })
    const shown = run(selected, {
      type: 'showResults',
      query: 'hotel',
      results: [hotel(1), hotel(2)],
    })
    expect(shown.resultSet?.results).toHaveLength(2)
    expect(shown.resultSet?.query).toBe('hotel')
    expect(shown.mapSelection).toBeNull()
    expect(run(shown, { type: 'clearResults' }).resultSet).toBeNull()
  })
})

describe('zgłoszenie bariery jako stan panelu (#95)', () => {
  it('„Wstecz” ze zgłoszenia wraca do poprzedniego widoku i wyłącza wskazywanie bariery', () => {
    const opened = run(
      initialState(),
      { type: 'openPanel', panel: { kind: 'route' } },
      { type: 'openPanel', panel: { kind: 'report', point: null } },
      { type: 'setPickTarget', target: 'report' },
    )
    const back = run(opened, { type: 'back' })
    expect(back.panel.kind).toBe('route')
    expect(back.pickTarget).toBeNull()
  })

  it('„Wstecz” nie rusza wskazywania punktu A/B', () => {
    const state = run(
      initialState(),
      { type: 'openPanel', panel: { kind: 'route' } },
      { type: 'setPickTarget', target: 'origin' },
    )
    expect(run(state, { type: 'back' }).pickTarget).toBe('origin')
  })
})

describe('zapamiętywanie w przeglądarce', () => {
  it('zapisuje i odczytuje tryb oraz personalizację', () => {
    const store = new Map<string, string>()
    const storage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    }
    const state = run(initialState(), { type: 'chooseProfile', profile: 'senior' })
    saveState(storage, state)
    expect(Object.keys(JSON.parse(store.get(STORAGE_KEY)!))).toEqual([
      'profile',
      'prefs',
      'customized',
      'layers',
      'baseMap',
    ])
    expect(initialState(loadSaved(storage)).profile).toBe('senior')
  })

  it('zapis ze starszej wersji: brakujące ustawienia i warstwy biorą się z trybu', () => {
    const defaults = PROFILE_DEFAULTS.wheelchair
    const [key] = Object.keys(defaults.prefs) as (keyof typeof defaults.prefs)[]
    const oldPrefs: Partial<typeof defaults.prefs> = { ...defaults.prefs }
    delete oldPrefs[key]
    const saved = JSON.stringify({ profile: 'wheelchair', prefs: oldPrefs, layers: {} })
    const state = initialState(loadSaved({ getItem: () => saved }))
    expect(state.prefs).toEqual(defaults.prefs)
    expect(state.layers).toEqual(defaults.layers)
  })

  it('zepsute dane albo zablokowana pamięć nie psują startu', () => {
    expect(loadSaved({ getItem: () => '{zepsute' })).toEqual({})
    expect(loadSaved({ getItem: () => '{"profile":"nieznany"}' })).toEqual({})
    expect(() =>
      saveState(
        {
          setItem: () => {
            throw new Error('QuotaExceeded')
          },
        },
        initialState(),
      ),
    ).not.toThrow()
  })

  it('braki danych: warstwa domyślnie wyłączona, focusMap przesuwa mapę także drugi raz', () => {
    const start = initialState()
    expect(start.layers.gaps).toBe(false)
    expect(run(start, { type: 'toggleLayer', layer: 'gaps' }).layers.gaps).toBe(true)

    const point = { lat: 50.057, lon: 19.936 }
    const once = run(start, { type: 'focusMap', point })
    const twice = run(once, { type: 'focusMap', point })
    expect(once.mapFocus).toEqual({ point, seq: 1 })
    expect(twice.mapFocus?.seq).toBe(2)
  })
})

describe('powłoka: podkład mapy i panel', () => {
  it('przełącza podkład i zapamiętuje go; zły zapis jest pomijany', () => {
    const state = run(initialState(), { type: 'setBaseMap', baseMap: 'satellite' })
    expect(state.baseMap).toBe('satellite')
    expect(initialState(loadSaved({ getItem: () => '{"baseMap":"3d"}' })).baseMap).toBe('standard')
  })

  it('zwinięty panel otwiera się przy przejściu do innego widoku', () => {
    const collapsed = run(initialState(), { type: 'toggleSidebar' })
    expect(collapsed.sidebarOpen).toBe(false)
    const opened = run(collapsed, { type: 'openPanel', panel: { kind: 'list', list: 'places' } })
    expect(opened.sidebarOpen).toBe(true)
    expect(opened.history).toEqual([{ kind: 'explore' }])
  })
})
