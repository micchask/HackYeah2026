import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { RouteResponse } from '../api/client'
import { RouteAlternatives } from './RouteAlternatives'
import { routeForVariant, selectedVariantLabel } from './routeVariants'

const route: RouteResponse = {
  distance_m: 600,
  duration_s: 720,
  accessibility_score: 90,
  confidence: 0.8,
  is_mock: false,
  warnings: [],
  rough_surface_m: 0,
  stairs_count: 0,
  explanation: 'Trasa omija bariery.',
  segments: [],
  alternatives: [
    {
      label: 'Najkrótsza trasa piesza',
      distance_m: 400,
      duration_s: 360,
      stairs_count: 2,
      rough_surface_m: 80,
      geometry: [],
      explanation: 'Krócej, ale przez schody.',
      segments: [
        {
          instruction: 'Idź prosto',
          distance_m: 100,
          geometry: [],
          difficulty: 'hard',
          accessibility_score: 20,
          confidence: 0.4,
          data_status: 'unverified',
        },
        {
          instruction: 'Skręć w prawo',
          distance_m: 300,
          geometry: [],
          difficulty: 'moderate',
          accessibility_score: 60,
          confidence: 0.8,
          data_status: 'verified',
        },
      ],
    },
  ],
}

describe('RouteAlternatives', () => {
  it('pokazuje trasę główną i warianty oraz pozwala wybrać wariant', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<RouteAlternatives route={route} selected={0} onChange={onChange} />)

    expect(screen.getAllByRole('radio')).toHaveLength(2)
    expect(screen.getByRole('radio', { name: /Najbardziej dostępna/ })).toBeChecked()
    expect(screen.getByText('Najkrótsza trasa piesza')).toBeInTheDocument()
    expect(screen.getByText('Krócej, ale przez schody.')).toBeInTheDocument()
    expect(screen.getByText(/dostępność 90\/100 · pewność danych 80%/)).toBeInTheDocument()
    expect(screen.getByText(/dostępność 50\/100 · pewność danych 70%/)).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: /Najkrótsza trasa piesza/ }))
    expect(onChange).toHaveBeenCalledWith(1)
  })

  it('nie zajmuje miejsca, gdy API nie zwróciło wariantów', () => {
    const { container } = render(
      <RouteAlternatives route={{ ...route, alternatives: [] }} selected={0} onChange={() => {}} />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})

describe('routeForVariant', () => {
  it('podmienia dane trasy i oblicza wyniki wariantu z jego segmentów', () => {
    const selected = routeForVariant(route, 1)

    expect(selected.distance_m).toBe(400)
    expect(selected.segments).toBe(route.alternatives?.[0].segments)
    expect(selected.accessibility_score).toBe(50)
    expect(selected.confidence).toBe(0.7)
    expect(selectedVariantLabel(route, 1)).toBe('Najkrótsza trasa piesza')
  })
})
