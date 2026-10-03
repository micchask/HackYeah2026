import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import type { RouteResponse } from '../api/client'
import { RouteDescription } from './RouteDescription'

const route: RouteResponse = {
  distance_m: 530,
  duration_s: 600,
  accessibility_score: 72,
  confidence: 0.68,
  is_mock: true,
  warnings: [],
  explanation: 'Trasa przykładowa.',
  segments: [
    {
      instruction: 'Idź prosto',
      distance_m: 320,
      geometry: [],
      difficulty: 'easy',
      accessibility_score: 100,
      confidence: 0.8,
      data_status: 'verified',
      warnings: [],
    },
    {
      instruction: 'Skręć w lewo',
      distance_m: 210,
      geometry: [],
      difficulty: 'hard',
      accessibility_score: 30,
      confidence: 0.5,
      data_status: 'unverified',
      surface: 'sett',
      street: 'Grodzka',
      sources: ['OpenStreetMap'],
      fetched_at: '2026-10-03T16:01:57Z',
      last_verified: '2025-07-16T00:00:00Z',
      warnings: ['Nierówna nawierzchnia'],
    },
  ],
}

describe('RouteDescription', () => {
  it('opisuje każdy segment tekstem', () => {
    render(<RouteDescription route={route} />)
    expect(screen.getByRole('heading', { name: 'Opis trasy' })).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByText(/dostępność 30\/100 · pewność danych 50%/)).toBeInTheDocument()
    expect(screen.getByText('Uwaga: Nierówna nawierzchnia')).toBeInTheDocument()
  })

  it('pokazuje szczegóły wybranego odcinka, Esc je zamyka i oddaje fokus', async () => {
    const user = userEvent.setup()
    render(<Selectable />)
    const step = screen.getByRole('button', { name: /Skręć w lewo/ })

    await user.click(step)
    const details = screen.getByRole('region', { name: 'Szczegóły odcinka: Grodzka' })
    expect(step).toHaveAttribute('aria-expanded', 'true')
    expect(details).toHaveTextContent('Weryfikacja w terenie16 lipca 2025')
    expect(details).toHaveTextContent('Dane pobrane3 października 2026')
    expect(details).toHaveTextContent('Jedno źródło, nikt tego jeszcze nie potwierdził.')

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('region', { name: /Szczegóły odcinka/ })).not.toBeInTheDocument()
    expect(step).toHaveFocus()
  })

  it('przenosi fokus na odcinek wybrany poza listą (np. na mapie)', () => {
    const { rerender } = render(<RouteDescription route={route} onSelect={() => {}} />)
    rerender(<RouteDescription route={route} selected={1} onSelect={() => {}} />)
    expect(screen.getByRole('button', { name: /Skręć w lewo/ })).toHaveFocus()
  })
})

function Selectable() {
  const [selected, setSelected] = useState<number | null>(null)
  return <RouteDescription route={route} selected={selected} onSelect={setSelected} />
}
