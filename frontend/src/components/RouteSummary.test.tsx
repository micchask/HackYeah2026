import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
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
}

describe('RouteSummary', () => {
  it('pokazuje wynik dostępności i pewność danych trasy', () => {
    render(<RouteSummary route={route} />)
    expect(screen.getByText('Dostępność trasy')).toBeInTheDocument()
    expect(screen.getByText('72/100')).toBeInTheDocument()
    expect(screen.getByText('Pewność danych')).toBeInTheDocument()
    expect(screen.getByText('68%')).toBeInTheDocument()
  })
})
