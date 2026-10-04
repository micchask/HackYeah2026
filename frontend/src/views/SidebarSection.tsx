// Sekcja panelu: krótki nagłówek, opcjonalny tag i „Pokaż więcej” zamiast długiej listy.
import { useId, type ReactNode } from 'react'
import { ChevronRightIcon } from '../components/icons'

interface Props {
  title: string
  tag?: ReactNode
  /** „Pokaż więcej” - otwiera pełną listę */
  onMore?: () => void
  moreLabel?: string
  children: ReactNode
}

export function SidebarSection({
  title,
  tag,
  onMore,
  moreLabel = 'Pokaż więcej',
  children,
}: Props) {
  const id = useId()
  return (
    <section className="sidebar-section" aria-labelledby={id}>
      <div className="sidebar-section-head">
        <h3 id={id}>{title}</h3>
        {tag}
        {onMore && (
          <button type="button" className="section-more" onClick={onMore}>
            {moreLabel}
            <span className="visually-hidden">: {title}</span>
            <ChevronRightIcon size={16} />
          </button>
        )}
      </div>
      {children}
    </section>
  )
}
