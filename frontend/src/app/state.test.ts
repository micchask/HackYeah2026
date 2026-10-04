import { describe, expect, it } from 'vitest'
import type { RouteResponse } from '../api/client'
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
  it('startuje w trybie „wózek” z panelem „Dla Ciebie”', () => {
    const state = initialState()
    expect(state.profile).toBe('wheelchair')
    expect(state.prefs).toEqual(PROFILE_DEFAULTS.wheelchair.prefs)
    expect(state.panel).toEqual({ kind: 'explore' })
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
    ])
    expect(initialState(loadSaved(storage)).profile).toBe('senior')
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
})
