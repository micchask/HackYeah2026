import type { BarrierType } from '../api/client'
import { barrierIconSvg } from './barrierStyle'

/** Ta sama ikona co na mapie - w legendzie i na liście barier. */
export function BarrierIcon({ type, size = 22 }: { type: BarrierType; size?: number }) {
  return (
    <img
      className="barrier-icon"
      src={`data:image/svg+xml;utf8,${encodeURIComponent(barrierIconSvg(type, size))}`}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
    />
  )
}
