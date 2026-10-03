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
  explanation: 'Ta trasa omija schody i nierówną nawierzchnię.',
  rough_surface_m: 20,
  stairs_count: 0,
  alternatives: [
    {
      label: 'Najkrótsza trasa piesza',
      distance_m: 450,
      duration_s: 480,
      stairs_count: 2,
      rough_surface_m: 100,
      geometry: [],
      explanation: 'Krótsza, ale prowadzi przez schody.',
      segments: [
        {
          instruction: 'Idź prosto',
          distance_m: 450,
          geometry: [],
          difficulty: 'hard',
          accessibility_score: 40,
          confidence: 0.5,
          data_status: 'unverified',
        },
      ],
    },
  ],
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

  it('porównuje wszystkie trasy w tabeli z nagłówkami dla czytnika ekranu', () => {
    render(<RouteSummary route={route} comparisonRoute={route} selectedVariant={0} />)

    const table = screen.getByRole('table', { name: 'Porównanie dostępnych tras' })
    const columnHeaders = screen.getAllByRole('columnheader')
    const rowHeaders = screen.getAllByRole('rowheader')

    expect(table).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /Najbardziej dostępna/ })).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: 'Najkrótsza trasa piesza' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('rowheader', { name: 'Dostępność' })).toBeInTheDocument()
    expect(screen.getByText('Krótsza, ale prowadzi przez schody.')).toBeInTheDocument()
    columnHeaders.forEach((header) => expect(header).toHaveAttribute('scope', 'col'))
    rowHeaders.forEach((header) => expect(header).toHaveAttribute('scope', 'row'))
  })
})
