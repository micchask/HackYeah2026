import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Legend } from './Legend'

describe('Legend', () => {
  it('opisuje włączone warstwy dodatkowymi ikonami o różnych kształtach', () => {
    render(
      <Legend
        showRoute={false}
        showBaseline={false}
        showInstitutions={false}
        demoLayers={['rest', 'parking', 'events']}
      />,
    )

    expect(screen.getByText('miejsce odpoczynku')).toBeInTheDocument()
    expect(screen.getByText('parking OzN')).toBeInTheDocument()
    expect(screen.getByText('wydarzenie dostępne')).toBeInTheDocument()
    expect(document.querySelectorAll('.demo-layer-icon')).toHaveLength(3)
    expect(
      new Set(
        [...document.querySelectorAll<HTMLImageElement>('.demo-layer-icon')].map(
          (icon) => icon.src,
        ),
      ).size,
    ).toBe(3)
  })
})
