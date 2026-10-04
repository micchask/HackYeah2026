import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Place } from '../../api/client'
import { DataContext, DispatchContext, StateContext, type AppData } from '../../app/context'
import type { SelectedPlace } from '../../app/selectedPlace'
import { initialState } from '../../app/state'
import { PlacePanel } from './PlacePanel'

const P = { lat: 50.06, lon: 19.94 }

const cafe: Place = {
  id: 'osm:node/2',
  city: 'krakow',
  name: 'Kawiarnia Bez Progu',
  category: 'cafe',
  location: P,
  attributes: [
    {
      key: 'wheelchair',
      value: 'yes',
      confidence: 0.6,
      status: 'unverified',
      provenance: { source: 'osm', source_type: 'osm', fetched_at: '2026-10-03T10:00:00Z' },
    },
  ],
} as Place

const DATA = { institutions: [] } as unknown as AppData

function renderPanel(place: SelectedPlace) {
  const dispatch = vi.fn()
  render(
    <StateContext.Provider value={initialState({ profile: 'wheelchair' })}>
      <DispatchContext.Provider value={dispatch}>
        <DataContext.Provider value={DATA}>
          <PlacePanel place={place} />
        </DataContext.Provider>
      </DispatchContext.Provider>
    </StateContext.Provider>,
  )
  return dispatch
}

describe('PlacePanel', () => {
  it('status słowem, paszport ze źródłem i pewnością', () => {
    renderPanel({ kind: 'place', place: cafe })
    expect(screen.getByRole('heading', { name: 'Kawiarnia Bez Progu' })).toBeInTheDocument()
    expect(screen.getByText('dostępne dla wózka')).toBeInTheDocument()
    expect(
      screen.getByText(/OpenStreetMap · pewność 60% · bez daty weryfikacji/),
    ).toBeInTheDocument()
  })

  it('akcje: „Prowadź tutaj”, „Ustaw jako start”, „Zgłoś zmianę”', async () => {
    const user = userEvent.setup()
    const dispatch = renderPanel({ kind: 'place', place: cafe })
    const named = { label: 'Kawiarnia Bez Progu', point: P }

    await user.click(screen.getByRole('button', { name: 'Prowadź tutaj' }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'setDestination', point: named })
    expect(dispatch).toHaveBeenCalledWith({ type: 'openPanel', panel: { kind: 'route' } })

    await user.click(screen.getByRole('button', { name: 'Ustaw jako start' }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'setOrigin', point: named })

    await user.click(screen.getByRole('button', { name: 'Zgłoś zmianę' }))
    expect(dispatch).toHaveBeenCalledWith({
      type: 'openPanel',
      panel: { kind: 'report', point: named },
    })
  })

  it('bez danych mówi wprost, że to nie znaczy „dostępne”', () => {
    renderPanel({ kind: 'place', place: { ...cafe, attributes: [] } })
    expect(screen.getByText('brak danych o dostępności')).toBeInTheDocument()
    expect(screen.getByText(/nie mamy danych o dostępności tego miejsca/i)).toBeInTheDocument()
  })
})
