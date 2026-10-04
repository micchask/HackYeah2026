import { accessIconSvg, type Access } from './placeCategories'

/** Ta sama ikona dostępności co na mapie - w legendzie i na liście miejsc. */
export function PlaceAccessIcon({ access, size = 20 }: { access: Access; size?: number }) {
  return (
    <img
      className="place-access-icon"
      src={`data:image/svg+xml;utf8,${encodeURIComponent(accessIconSvg(access, size))}`}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
    />
  )
}
