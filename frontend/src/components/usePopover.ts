// Wspólna logika małych okienek (warstwy, legenda, menu profilu):
// klik poza okienkiem je zamyka, Esc zamyka i oddaje fokus na przycisk.
import { useEffect, useId, useRef, useState } from 'react'

export function usePopover<T extends HTMLElement = HTMLButtonElement>() {
  const [open, setOpen] = useState(false)
  const id = useId()
  const wrapper = useRef<HTMLDivElement>(null)
  const trigger = useRef<T>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!wrapper.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      trigger.current?.focus()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return {
    open,
    setOpen,
    toggle: () => setOpen((o) => !o),
    id,
    wrapper,
    trigger,
    /** Atrybuty przycisku otwierającego */
    triggerProps: { 'aria-expanded': open, 'aria-controls': id },
  }
}
