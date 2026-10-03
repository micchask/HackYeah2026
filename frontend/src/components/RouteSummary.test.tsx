import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { RouteResponse } from '../api/client'
import { RouteSummary } from './RouteSummary'

const route: RouteResponse = {
  distance_m: 530,
  duration_s: 600,
  accessibility_score: 72,
  confidence: 0.68,
  is_mock: false,
  warnings: [],
  segments: [],
  explanation: 'Ta trasa omija schody i nierówną nawierzchnię.',
}

describe('RouteSummary', () => {
  it('pokazuje wynik dostępności i pewność danych trasy', () => {
    render(<RouteSummary route={route} />)
    expect(screen.getByText('Dostępność trasy')).toBeInTheDocument()
    expect(screen.getByText('72/100')).toBeInTheDocument()
    expect(screen.getByText('Pewność danych')).toBeInTheDocument()
    expect(screen.getByText('68%')).toBeInTheDocument()
    expect(screen.getByText(route.explanation)).toBeInTheDocument()
  })
})

describe('RouteSummary – bariery na trasie', () => {
  const segment = (street: string, barriers: RouteResponse['segments'][number]['barriers']) => ({
    instruction: `Idź: ${street}`,
    distance_m: 100,
    geometry: [],
    street,
    difficulty: 'hard' as const,
    accessibility_score: 40,
    confidence: 0.6,
    data_status: 'unverified' as const,
    barriers,
  })

  it('podsumowuje bariery i prowadzi do szczegółów odcinka', async () => {
    const onSelectSegment = vi.fn()
    const withBarriers: RouteResponse = {
      ...route,
      segments: [
        segment('Floriańska', []),
        segment('Grodzka', [{ type: 'rough_surface', description: 'Kostka granitowa (bruk)' }]),
        segment('Kanonicza', [
          { type: 'kerb', description: 'Krawężnik ok. 10 cm' },
          { type: 'rough_surface', description: 'Kostka granitowa (bruk)' },
        ]),
      ],
    }
    render(<RouteSummary route={withBarriers} onSelectSegment={onSelectSegment} />)
    expect(
      screen.getByRole('heading', {
        name: 'Na tej trasie: 1 wysoki krawężnik, 2 odcinki nierównej nawierzchni',
      }),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Szczegóły odcinka 3' }))
    expect(onSelectSegment).toHaveBeenCalledWith(2)
  })

  it('mówi wprost, gdy na trasie nie ma znanych barier', () => {
    render(<RouteSummary route={{ ...route, segments: [segment('Floriańska', [])] }} />)
    expect(screen.getByText('Na tej trasie nie ma znanych barier.')).toBeInTheDocument()
  })
})
