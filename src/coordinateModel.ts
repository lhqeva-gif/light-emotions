import { clamp, nearestTarget, type Vec } from "./emotion"

export function coordinateOverride(v: Vec): Vec {
  if (![v.p, v.a, v.d].every(Number.isFinite))
    throw new Error("坐标必须为有限数值")
  return { p: clamp(v.p), a: clamp(v.a), d: clamp(v.d) }
}

export function overrideModel<T extends {
  v: Vec
  target: string
  manual: boolean
},>(model: T, override?: Vec): T {
  if (!override) return model
  const v = coordinateOverride(override)
  return { ...model, v, target: nearestTarget(v), manual: true }
}
