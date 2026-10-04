// Chip „Tryb: …” w górnym pasku (plan §5.2, #88): pokazuje wybrany tryb, menu „Zmień tryb” / „Dostosuj”.
import { useEffect, useId, useRef, useState } from 'react'
import { useApp } from '../app/context'
import { findMode, useModes } from '../app/useModes'

export function ProfileChip() {
  const [{ profile, customized }, dispatch] = useApp()
  const modes = useModes()
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const wrapper = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)

  // Klik poza chipem zamyka menu; Esc zamyka je i oddaje fokus na chip
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!wrapper.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      button.current?.focus()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const mode = findMode(modes, profile)
  if (!profile || !mode) return null

  const run = (action: 'resetProfile' | 'openSettings') => {
    setOpen(false)
    dispatch({ type: action })
  }

  return (
    <div ref={wrapper} className="profile-chip">
      <button
        ref={button}
        id="profile-chip"
        type="button"
        className="profile-chip-button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((o) => !o)}
      >
        Tryb:{' '}
        <span aria-hidden="true" className="profile-chip-icon">
          {mode.icon}
        </span>{' '}
        {mode.label}
        {customized && (
          <>
            {' '}
            <span className="profile-chip-custom">· dostosowany</span>
          </>
        )}
      </button>
      {open && (
        <ul id={menuId} className="profile-chip-menu">
          <li>
            <button type="button" onClick={() => run('resetProfile')}>
              Zmień tryb
            </button>
          </li>
          <li>
            <button type="button" onClick={() => run('openSettings')}>
              Dostosuj
            </button>
          </li>
        </ul>
      )}
    </div>
  )
}
