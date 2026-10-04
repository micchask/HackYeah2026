import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Place } from '../api/client'
import { DataContext, DispatchContext, StateContext, type AppData } from '../app/context'
import { initialState } from '../app/state'
import { LayerChips } from './LayerChips'

const DATA: AppData = {
  places: [
    { id: '1', city: 'krakow', category: 'cafe', location: { lat: 50.06, lon: 19.94 } },
    { id: '2', city: 'krakow', category: 'museum', location: { lat: 50.06, lon: 19.94 } },
  ] as Place[],
  placesError: null,
  institutions: [],
  barriers: [],
  barriersTruncated: false,
  barriersLoading: false,
  barriersError: null,
  restSpots: [
    {
      id: 'osm:bench/1',
      kind: 'bench',
      name: null,
      location: { lat: 50.06, lon: 19.94 },
      details: {},
      source: 'osm',
    },
  ],
  parkingSpots: [
    {
      id: 'demo:parking/1',
      kind: 'parking_disabled',
      name: 'Parking testowy',
      location: { lat: 50.06, lon: 19.94 },
      details: { spaces: 2 },
      source: 'demo',
    },
  ],
  events: [],
} as unknown as AppData

function renderChips() {
  const dispatch = vi.fn()
  render(
    <StateContext.Provider value={initialState({ profile: 'wheelchair' })}>
      <DispatchContext.Provider value={dispatch}>
        <DataContext.Provider value={DATA}>
          <LayerChips />
        </DataContext.Provider>
      </DispatchContext.Provider>
    </StateContext.Provider>,
  )
  return dispatch
}

describe('LayerChips', () => {
  it('chipy mają aria-pressed wg trybu i liczbę obiektów w widoku', () => {
    renderChips()
    expect(screen.getByRole('group', { name: 'Warstwy mapy' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bariery' })).toHaveAttribute('aria-pressed', 'true')
    const food = screen.getByRole('button', { name: 'Jedzenie i kultura 2 w widoku' })
    expect(food).toHaveAttribute('aria-pressed', 'true') // FE1 trzyma „places” włączone
    expect(screen.getByRole('button', { name: 'Odpoczynek 1 w widoku' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.getByRole('button', { name: 'Parking OzN 1 w widoku' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Wydarzenia' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('klik przełącza warstwę', async () => {
    const user = userEvent.setup()
    const dispatch = renderChips()
    await user.click(screen.getByRole('button', { name: 'Toalety i zdrowie' }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'toggleLayer', layer: 'health' })
  })
})
