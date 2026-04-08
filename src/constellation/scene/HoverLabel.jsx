// 3D HoverLabel disabled — drei Text crashes degraded WebGL contexts even when
// isContextLost() returns false. DOM-based DomHoverLabel in ConstellationPage
// handles all hover labels reliably.
export default function HoverLabel() {
  return null;
}
