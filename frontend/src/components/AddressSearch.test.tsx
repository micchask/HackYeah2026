import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GeocodeResult } from '../api/client'
import { AddressSearch } from './AddressSearch'

const RESULTS: GeocodeResult[] = [
  {
    label: 'Floriańska',
    description: 'Stare Miasto',
    kind: 'deptak',
    point: { lat: 50.0648, lon: 19.9413 },
  },
  {
    label: 'Brama Floriańska',
    description: 'Floriańska · Stare Miasto',
    kind: null,
    point: { lat: 50.0649, lon: 19.9414 },
  },
]

function mockFetch(response: Response) {
  const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => response)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderSearch() {
  const onSelect = vi.fn()
  render(
    <AddressSearch
      label="Start"
      placeholder="Wpisz adres startu"
      value={null}
      city="krakow"
      onSelect={onSelect}
    />,
  )
  return { onSelect, input: screen.getByRole('combobox', { name: 'Start' }) }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('AddressSearch', () => {
  it('wpisanie tekstu, strzałka w dół i Enter ustawiają punkt', async () => {
    const fetchMock = mockFetch(Response.json(RESULTS))
    const user = userEvent.setup()
    const { onSelect, input } = renderSearch()

    await user.type(input, 'Flor')
    expect(await screen.findByRole('option', { name: /Brama Floriańska/ })).toBeInTheDocument()
    expect(input).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText(/2 podpowiedzi/)).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/geocode?q=Flor&city=krakow')

    await user.keyboard('{ArrowDown}{ArrowDown}')
    const active = screen.getByRole('option', { name: /Brama Floriańska/ })
    expect(active).toHaveAttribute('aria-selected', 'true')
    expect(input).toHaveAttribute('aria-activedescendant', active.id)

    await user.keyboard('{Enter}')
    expect(onSelect).toHaveBeenCalledWith({
      label: 'Brama Floriańska',
      point: { lat: 50.0649, lon: 19.9414 },
    })
    expect(input).toHaveValue('Brama Floriańska')
    expect(input).toHaveAttribute('aria-expanded', 'false')
    expect(input).toHaveFocus()
  })

  it('Esc zamyka listę podpowiedzi', async () => {
    mockFetch(Response.json(RESULTS))
    const user = userEvent.setup()
    const { onSelect, input } = renderSearch()

    await user.type(input, 'Flor')
    await screen.findAllByRole('option')
    await user.keyboard('{Escape}')
    expect(input).toHaveAttribute('aria-expanded', 'false')
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('gdy geokoder nie działa, pokazuje komunikat w role="alert"', async () => {
    mockFetch(
      Response.json({ detail: 'Wyszukiwarka adresów jest chwilowo niedostępna.' }, { status: 503 }),
    )
    const user = userEvent.setup()
    const { input } = renderSearch()

    await user.type(input, 'Flor')
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Wyszukiwarka adresów jest chwilowo niedostępna.',
    )
    expect(input).toHaveAttribute('aria-invalid', 'true')
  })
})
