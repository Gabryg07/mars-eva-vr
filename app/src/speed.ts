/** Tobler walk factor: 1 on flat ground, lower as the slope gets harder. */
export function slopeSpeedMul(deg: number): number {
  const tan = Math.tan((Math.min(Math.max(deg, 0), 55) * Math.PI) / 180);
  const k = 3.5;
  const off = 0.05;
  const mul = Math.exp(-k * Math.abs(tan + off)) / Math.exp(-k * off);
  return Math.max(0.16, Math.min(1, mul));
}
