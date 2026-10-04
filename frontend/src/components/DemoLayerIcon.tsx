import { demoLayerIconDataUrl, type DemoLayerId } from './demoLayerStyle'

export function DemoLayerIcon({ kind, size = 22 }: { kind: DemoLayerId; size?: number }) {
  return (
    <img
      className="demo-layer-icon"
      src={demoLayerIconDataUrl(kind)}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
    />
  )
}
