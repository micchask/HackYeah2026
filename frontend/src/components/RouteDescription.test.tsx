import { render, screen } from '@testing-library/react'
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
      warnings: ['Nierówna nawierzchnia'],
    },
  ],
}

describe('RouteDescription', () => {
  it('opisuje każdy segment tekstem', () => {
    render(<RouteDescription route={route} />)
    expect(screen.getByRole('heading', { name: 'Opis trasy' })).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByText('Uwaga: Nierówna nawierzchnia')).toBeInTheDocument()
  })
})
