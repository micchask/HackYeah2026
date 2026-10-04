import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Report } from '../api/client'
import { ReportForm } from './ReportForm'
import type { NamedPoint } from './RoutePoints'

const SUKIENNICE: NamedPoint = { label: 'Sukiennice', point: { lat: 50.0617, lon: 19.9373 } }

function saved(body: Record<string, unknown>): Report {
  return {
    id: 'r-1',
    city: 'krakow',
    status: 'pending',
    created_at: '2026-10-03T18:00:00Z',
    location: SUKIENNICE.point,
    attribute: 'elevator',
    value: false,
    ...body,
  } as Report
}

function mockApi() {
  const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === 'POST') return Response.json(saved(JSON.parse(String(init.body))))
    return Response.json([])
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderForm(point: NamedPoint | null = SUKIENNICE) {
  const onPointChange = vi.fn()
  render(
    <ReportForm
      city="krakow"
      point={point}
      onPointChange={onPointChange}
      picking={false}
      onPick={() => {}}
      segmentPoint={null}
    />,
  )
  return { onPointChange }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ReportForm', () => {
  it('wysyła zgłoszenie niedziałającej windy i potwierdza je w role="status"', async () => {
    const fetchMock = mockApi()
    const user = userEvent.setup()
    const { onPointChange } = renderForm()

    await user.click(screen.getByRole('button', { name: 'Zgłoś' }))
    await user.click(screen.getByRole('radio', { name: /Niedziałająca winda/ }))
    await user.type(screen.getByRole('textbox', { name: /Komentarz/ }), 'Winda stoi')
    await user.click(screen.getByRole('button', { name: 'Wyślij zgłoszenie' }))

    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')
    expect(String(post?.[0])).toContain('/api/reports?city=krakow')
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({
      type: 'elevator_broken',
      location: SUKIENNICE.point,
      comment: 'Winda stoi',
      // losowy identyfikator urządzenia - autor nie potwierdzi własnego zgłoszenia (#62)
      reporter: expect.any(String),
    })
    const confirmation = await screen.findByText(
      'Dziękujemy! Zgłoszenie „Niedziałająca winda” zapisane – czeka na weryfikację.',
    )
    // <output> ma rolę status - czytnik ogłosi potwierdzenie
    expect(confirmation.closest('output')).not.toBeNull()
    expect(onPointChange).toHaveBeenCalledWith(null)
    expect(screen.getByText('czeka na weryfikację')).toBeInTheDocument()
  })

  it('dla ogólnej bariery wysyła wybraną cechę i wartość', async () => {
    const fetchMock = mockApi()
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('button', { name: 'Zgłoś' }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Czego dotyczy' }), 'step_count')
    const value = screen.getByRole('spinbutton', { name: /Stan na miejscu/ })
    await user.clear(value)
    await user.type(value, '12')
    await user.click(screen.getByRole('button', { name: 'Wyślij zgłoszenie' }))

    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')
    expect(JSON.parse(String(post?.[1]?.body))).toMatchObject({
      type: 'barrier',
      attribute: 'step_count',
      value: 12,
    })
  })

  it('bez wskazanego miejsca pokazuje błąd w role="alert"', async () => {
    const fetchMock = mockApi()
    const user = userEvent.setup()
    renderForm(null)

    await user.click(screen.getByRole('button', { name: 'Zgłoś' }))
    await user.click(screen.getByRole('button', { name: 'Wyślij zgłoszenie' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Wskaż miejsce bariery')
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false)
  })
})

describe('ReportForm w panelu zgłoszenia (#95)', () => {
  it('bez przycisku „Zwiń”, a po wysłaniu przekazuje zgłoszenie rodzicowi', async () => {
    mockApi()
    const user = userEvent.setup()
    const onSent = vi.fn()
    render(
      <ReportForm
        city="krakow"
        point={SUKIENNICE}
        onPointChange={() => {}}
        picking={false}
        onPick={() => {}}
        segmentPoint={null}
        defaultOpen
        collapsible={false}
        onSent={onSent}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Zwiń' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: /Niedziałająca winda/ }))
    await user.click(screen.getByRole('button', { name: 'Wyślij zgłoszenie' }))

    await vi.waitFor(() => expect(onSent).toHaveBeenCalledOnce())
    expect(onSent.mock.calls[0][0].type).toBe('elevator_broken')
    // potwierdzenie pokazuje panel (ReportSent), formularz go nie dubluje
    expect(screen.queryByText(/Dziękujemy!/)).not.toBeInTheDocument()
  })
})
