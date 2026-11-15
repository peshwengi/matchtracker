export interface VelocityStats {
  count: number
  averageFps: number
  /** Sample standard deviation (n - 1), as chronographs report it. */
  sdFps: number
  /** Extreme spread: fastest minus slowest. */
  esFps: number
}

export function velocityStats(velocitiesFps: number[]): VelocityStats | undefined {
  const count = velocitiesFps.length
  if (count === 0) return undefined
  const averageFps = velocitiesFps.reduce((sum, v) => sum + v, 0) / count
  const sumSquares = velocitiesFps.reduce((sum, v) => sum + (v - averageFps) ** 2, 0)
  return {
    count,
    averageFps,
    sdFps: count > 1 ? Math.sqrt(sumSquares / (count - 1)) : 0,
    esFps: Math.max(...velocitiesFps) - Math.min(...velocitiesFps),
  }
}
