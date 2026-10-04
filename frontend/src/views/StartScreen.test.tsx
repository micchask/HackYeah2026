import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ModePreset } from '../api/client'
import { DispatchContext, StateContext } from '../app/context'
import { initialState, PROFILE_DEFAULTS, type AppState } from '../app/state'
import { resetModesCache } from '../app/useModes'
import { ProfileChip } from './ProfileChip'
import { StartScreen } from './StartScreen'

const LAYERS = {
  barriers: true,
  health: true,
  institutions: true,
  places: false,
  reports: false,
  rest: false,
  parking: true,
  events: false,
}

// Odpowiedź GET /api/profiles - opis inny niż zapas, żeby było widać, skąd pochodzą dane
const PRESETS: ModePreset[] = (
  ['wheelchair', 'senior', 'tourist', 'stroller', 'guest'] as const
).map((id) => ({
  id,
  label: {
    wheelchair: 'Poruszam się na wózku',
    senior: 'Wolniejsze tempo, mniej podejść',
    tourist: 'Zwiedzam miasto',
    stroller: 'Jestem z wózkiem dziecięcym',
    guest: 'Bez profilu',
  }[id],
  description: `opis z API: ${id}`,
  icon: '★',
  profile: id === 'tourist' || id === 'guest' ? 'walk' : id,
  preferences: { ...PROFILE_DEFAULTS[id].prefs, max_kerb_height_cm: 7 },
  layers: LAYERS,
}))

function renderWith(ui: ReactNode, state: AppState) {
  const dispatch = vi.fn()
  render(
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>{ui}</DispatchContext.Provider>
    </StateContext.Provider>,
  )
  return dispatch
}

beforeEach(() => {
  resetModesCache()
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json(PRESETS)),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('StartScreen', () => {
  it('modalny dialog z fokusem na nagłówku i kafelkami z /api/profiles', async () => {
    renderWith(<StartScreen />, initialState())
    const dialog = screen.getByRole('dialog', { name: 'Jak się poruszasz?' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByRole('heading', { name: 'Jak się poruszasz?' })).toHaveFocus()
    const tile = screen.getByRole('button', { name: 'Poruszam się na wózku' })
    await waitFor(() => expect(tile).toHaveAccessibleDescription('opis z API: wheelchair'))
    expect(screen.getByText('Zawsze możesz to zmienić i dostosować na mapie.')).toBeInTheDocument()
  })

  it('wybór kafelka wywołuje chooseProfile z właściwym id i preferencjami z API', async () => {
    const user = userEvent.setup()
    const dispatch = renderWith(<StartScreen />, initialState())
    await screen.findByText('opis z API: senior')
    await user.click(screen.getByRole('button', { name: 'Wolniejsze tempo, mniej podejść' }))
    expect(dispatch).toHaveBeenCalledWith({
      type: 'chooseProfile',
      profile: 'senior',
      prefs: { ...PROFILE_DEFAULTS.senior.prefs, max_kerb_height_cm: 7 },
    })
  })

  it('Esc = „Kontynuuj bez profilu”', async () => {
    const user = userEvent.setup()
    const dispatch = renderWith(<StartScreen />, initialState())
    await user.keyboard('{Escape}')
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'chooseProfile', profile: 'guest' }),
    )
  })

  it('Tab krąży po przyciskach dialogu', async () => {
    const user = userEvent.setup()
    renderWith(<StartScreen />, initialState())
    const buttons = screen.getAllByRole('button')
    buttons.at(-1)?.focus()
    await user.tab()
    expect(buttons[0]).toHaveFocus()
    await user.tab({ shift: true })
    expect(buttons.at(-1)).toHaveFocus()
  })

  it('nie pokazuje się, gdy tryb jest wybrany', () => {
    renderWith(<StartScreen />, initialState({ profile: 'wheelchair' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('ProfileChip', () => {
  it('pokazuje tryb i „dostosowany”, menu prowadzi do „Zmień tryb” i „Dostosuj”', async () => {
    const user = userEvent.setup()
    const state = { ...initialState({ profile: 'wheelchair' }), customized: true }
    const dispatch = renderWith(<ProfileChip />, state)
    const chip = screen.getByRole('button', { name: /Tryb: .*Poruszam się na wózku · dostosowany/ })
    expect(chip).toHaveAttribute('aria-expanded', 'false')

    await user.click(chip)
    expect(chip).toHaveAttribute('aria-expanded', 'true')
    await user.click(screen.getByRole('button', { name: 'Zmień tryb' }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'resetProfile' })

    await user.click(chip)
    await user.click(screen.getByRole('button', { name: 'Dostosuj' }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'openSettings' })
  })

  it('Esc zamyka menu i oddaje fokus na chip', async () => {
    const user = userEvent.setup()
    renderWith(<ProfileChip />, initialState({ profile: 'guest' }))
    const chip = screen.getByRole('button', { name: /Tryb: .*Bez profilu/ })
    await user.click(chip)
    await user.keyboard('{Escape}')
    expect(chip).toHaveAttribute('aria-expanded', 'false')
    expect(chip).toHaveFocus()
  })
})
