/** Shaft + filled head; tip points in (ux, uy) — downstream / downwind. */
export function drawFlowArrow(
  c: CanvasRenderingContext2D,
  pixelsPerMeter: number,
  x: number,
  y: number,
  ux: number,
  uy: number,
  length: number,
): void {
  const tailX = x - ux * length * 0.42
  const tailY = y - uy * length * 0.42
  const headX = x + ux * length * 0.58
  const headY = y + uy * length * 0.58

  c.beginPath()
  c.moveTo(tailX, tailY)
  c.lineTo(headX, headY)
  c.stroke()

  const headLen = Math.min(length * 0.38, (2.8 / pixelsPerMeter))
  const angle = Math.atan2(uy, ux)
  c.beginPath()
  c.moveTo(headX, headY)
  c.lineTo(
    headX - Math.cos(angle - 0.42) * headLen,
    headY - Math.sin(angle - 0.42) * headLen,
  )
  c.lineTo(
    headX - Math.cos(angle + 0.42) * headLen,
    headY - Math.sin(angle + 0.42) * headLen,
  )
  c.closePath()
  c.fill()
}
