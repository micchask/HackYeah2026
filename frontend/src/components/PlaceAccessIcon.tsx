import {
  accessBadgeSvg,
  accessIconSvg,
  kindIconSvg,
  placeIconSvg,
  type Access,
  type PlaceKind,
} from './placeCategories'

function SvgImg({ svg, size, className }: { svg: string; size: number; className: string }) {
  return (
    <img
      className={className}
      src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
    />
  )
}

/** Sama ikona dostępności - przy statusie w panelu miejsca. */
export function PlaceAccessIcon({ access, size = 20 }: { access: Access; size?: number }) {
  return <SvgImg svg={accessIconSvg(access, size)} size={size} className="place-access-icon" />
}

/** Ta sama ikona co na mapie: rodzaj miejsca + kwadracik dostępności - na listach. */
export function PlaceIcon({
  kind,
  access,
  size = 32,
}: {
  kind: PlaceKind
  access: Access
  size?: number
}) {
  return <SvgImg svg={placeIconSvg(kind, access, size)} size={size} className="place-access-icon" />
}

/** Kwadrat rodzaju bez dostępności - w legendzie. */
export function PlaceKindIcon({ kind, size = 20 }: { kind: PlaceKind; size?: number }) {
  return <SvgImg svg={kindIconSvg(kind, size)} size={size} className="place-access-icon" />
}

/** Kwadracik dostępności jak na znaczniku - w legendzie. */
export function AccessBadgeIcon({ access, size = 14 }: { access: Access; size?: number }) {
  return <SvgImg svg={accessBadgeSvg(access, size)} size={size} className="place-access-icon" />
}
