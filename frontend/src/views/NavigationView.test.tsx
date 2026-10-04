import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { RouteResponse } from '../api/client'
import { DispatchContext, StateContext } from '../app/context'
import { initialState } from '../app/state'
import type { Navigation } from '../app/useNavigation'
import { NavigationView } from './NavigationView'

const route = {
  distance_m: 600,
  duration_s: 600,
  segments: [
    {
      instruction: 'Ruszaj na północ: ul. Floriańska, 600 m.',
      warnings: ['Krawężnik 4 cm'],
      geometry: [],
    },
  ],
} as unknown as RouteResponse

function nav(overrides: Partial<Navigation> = {}): Navigation {
  return {
    mode: 'sim',
    route,
    fix: { point: { lat: 50.06, lon: 19.93 }, heading: 0 },
    progress: { offRoute: 2, along: 300, segment: 0, toManeuver: 40, remaining: 300, heading: 0 },
    maneuver: { kind: 'right', text: 'Skręć w prawo', street: 'ul. Szpitalna', distance: 40 },
    status: 'navigating',
    updatedAt: new Date(2026, 9, 4, 14, 0).getTime(),
    announcement: 'Za 40 metrów skręć w prawo: ul. Szpitalna.',
    muted: false,
    setMuted: vi.fn(),
    ...overrides,
  }
}

function renderView(value: Navigation, follow = true) {
  const dispatch = vi.fn()
  const onExit = vi.fn()
  const onRecenter = vi.fn()
  render(
    <StateContext.Provider value={{ ...initialState(), navigation: value.mode }}>
      <DispatchContext.Provider value={dispatch}>
        <NavigationView nav={value} follow={follow} onRecenter={onRecenter} onExit={onExit} />
      </DispatchContext.Provider>
    </StateContext.Provider>,
  )
  return { dispatch, onExit, onRecenter }
}

describe('NavigationView', () => {
  it('pokazuje manewr, ostrzeżenie odcinka, czas i przyjazd; wskazówka dla czytnika', async () => {
    const user = userEvent.setup()
    const value = nav()
    const { onExit } = renderView(value)
    expect(screen.getByText('40 m')).toBeInTheDocument()
    expect(screen.getByText('Skręć w prawo')).toBeInTheDocument()
    expect(screen.getByText('ul. Szpitalna')).toBeInTheDocument()
    expect(screen.getByText('Krawężnik 4 cm')).toBeInTheDocument()
    expect(screen.getByText('5 min')).toBeInTheDocument()
    expect(screen.getByText(/300 m · przyjazd 14:05/)).toBeInTheDocument()
    expect(screen.getByText('Za 40 metrów skręć w prawo: ul. Szpitalna.')).toHaveAttribute(
      'aria-live',
      'assertive',
    )

    await user.click(screen.getByRole('button', { name: 'Wskazówki głosowe' }))
    expect(value.setMuted).toHaveBeenCalledWith(true)
    await user.click(screen.getByRole('button', { name: 'Zakończ' }))
    expect(onExit).toHaveBeenCalled()
  })

  it('bez GPS proponuje symulację, a po przesunięciu mapy - wyśrodkowanie', async () => {
    const user = userEvent.setup()
    const { dispatch, onRecenter } = renderView(nav({ mode: 'gps', status: 'gps-error' }), false)
    await user.click(screen.getByRole('button', { name: 'Symuluj przejście trasy' }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'startNavigation', mode: 'sim' })
    await user.click(screen.getByRole('button', { name: 'Wyśrodkuj' }))
    expect(onRecenter).toHaveBeenCalled()
  })

  it('u celu', () => {
    renderView(nav({ status: 'arrived' }))
    expect(screen.getByText('Jesteś u celu')).toBeInTheDocument()
  })
})
