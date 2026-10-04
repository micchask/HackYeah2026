// Ekran powitalny (plan §5.1): pełny ekran, gdy w przeglądarce nie ma zapisanego profilu.
// Wybór kafelka + „Kontynuuj”; Esc = „Gość”. Profil zmienia się później chipem w pasku wyszukiwania.
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { useApp } from '../app/context'
import { MODE_META, MODE_ORDER } from '../app/modeMeta'
import type { ProfileId } from '../app/state'
import { useModes } from '../app/useModes'
import { ArrowRightIcon, CheckIcon, LogoMark } from '../components/icons'

export function StartScreen() {
  const [{ profile }, dispatch] = useApp()
  const modes = useModes()
  if (profile !== null) return null

  const choose = (id: ProfileId) => {
    const mode = modes.find((m) => m.id === id)
    dispatch({ type: 'chooseProfile', profile: id, prefs: mode?.prefs })
    // Ekran znika - fokus na chip profilu, żeby klawiatura nie wylądowała na początku strony
    requestAnimationFrame(() => document.getElementById('profile-chip')?.focus())
  }
  return <StartDialog onChoose={choose} />
}

export function StartDialog({ onChoose }: { onChoose: (id: ProfileId) => void }) {
  const id = useId()
  const dialog = useRef<HTMLDialogElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const [selected, setSelected] = useState<ProfileId | null>(null)

  useEffect(() => {
    heading.current?.focus()
  }, [])

  // Modalny dialog: Tab krąży po przyciskach dialogu, Esc = „Gość”
  function onKeyDown(e: KeyboardEvent<HTMLDialogElement>) {
    if (e.key === 'Escape') {
      e.preventDefault()
      onChoose('guest')
      return
    }
    if (e.key !== 'Tab' || !dialog.current) return
    const buttons = Array.from(dialog.current.querySelectorAll('button:not([disabled])'))
    const first = buttons[0] as HTMLElement | undefined
    const last = buttons.at(-1) as HTMLElement | undefined
    const active = document.activeElement
    if (e.shiftKey && (active === first || active === heading.current)) {
      e.preventDefault()
      last?.focus()
    } else if (!e.shiftKey && active === last) {
      e.preventDefault()
      first?.focus()
    }
  }

  return (
    <div className="start-screen">
      <dialog
        ref={dialog}
        open
        aria-modal="true"
        aria-labelledby={`${id}-heading`}
        aria-describedby={`${id}-lead`}
        className="start-dialog"
        onKeyDown={onKeyDown}
      >
        <div className="start-hero">
          <div className="start-brand">
            <LogoMark size={44} />
            <span>BezPrzeszkód</span>
          </div>
          <p id={`${id}-lead`} className="start-lead">
            Odkrywaj bez ograniczeń. Sprawdź, którędy iść i gdzie warto zajrzeć.
          </p>
        </div>

        <div className="start-body">
          <h2 id={`${id}-heading`} ref={heading} tabIndex={-1}>
            Jak się poruszasz?
          </h2>
          <fieldset className="mode-tiles">
            <legend className="visually-hidden">Wybierz profil</legend>
            {MODE_ORDER.map((mode) => {
              const meta = MODE_META[mode]
              return (
                <button
                  key={mode}
                  type="button"
                  className="mode-tile"
                  aria-pressed={selected === mode}
                  aria-describedby={`${id}-${mode}-desc`}
                  onClick={() => setSelected(mode)}
                  onDoubleClick={() => onChoose(mode)}
                >
                  <span className="mode-tile-icon">
                    <meta.Icon size={28} />
                  </span>
                  <span className="mode-tile-label">{meta.title}</span>
                  <span id={`${id}-${mode}-desc`} className="mode-tile-desc">
                    {meta.tagline}
                  </span>
                  {selected === mode && <CheckIcon size={18} className="mode-tile-check" />}
                </button>
              )
            })}
          </fieldset>

          <div className="start-actions">
            <button
              type="button"
              className="primary-button start-continue"
              disabled={!selected}
              onClick={() => selected && onChoose(selected)}
            >
              Kontynuuj <ArrowRightIcon size={18} />
            </button>
            <p className="start-note">Profil zmienisz lub dopasujesz w każdej chwili na mapie.</p>
          </div>
        </div>
      </dialog>
    </div>
  )
}
