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

export interface PooledVelocityStats {
  /** Total shots across all strings. */
  count: number
  /** Strings with at least one shot. */
  stringCount: number
  /** Average of every shot, regardless of string. */
  averageFps: number
  /**
   * Pooled sample SD: each string's spread is measured around its own average,
   * then combined weighted by degrees of freedom. A shift in average velocity
   * between sessions (temperature, for instance) therefore does not inflate it.
   * Undefined when no string has two or more shots.
   */
  sdFps: number | undefined
}

/** Combine several strings fired from the same ammo batch into one SD estimate. */
export function pooledVelocityStats(strings: number[][]): PooledVelocityStats | undefined {
  const nonEmpty = strings.filter((s) => s.length > 0)
  const count = nonEmpty.reduce((sum, s) => sum + s.length, 0)
  if (count === 0) return undefined

  let sumSquares = 0
  let degreesOfFreedom = 0
  let total = 0
  for (const string of nonEmpty) {
    const average = string.reduce((sum, v) => sum + v, 0) / string.length
    sumSquares += string.reduce((sum, v) => sum + (v - average) ** 2, 0)
    degreesOfFreedom += string.length - 1
    total += average * string.length
  }

  return {
    count,
    stringCount: nonEmpty.length,
    averageFps: total / count,
    sdFps: degreesOfFreedom > 0 ? Math.sqrt(sumSquares / degreesOfFreedom) : undefined,
  }
}
