// 用户反馈：情绪感知记录 → 统计 → 反馈权重（可信度加权）→ 校准情绪坐标
// 数据保存在本浏览器 localStorage，可导入 / 导出 JSON、CSV 汇总多端数据
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react"
import { clamp, dist, emotionTargets, nearestTarget, type Vec } from "./emotion"

export interface FeedbackRecord {
  id: string
  /** 画廊条目 id（库内意境 id 或灯光素材 id） */
  item: string
  at: number
  /** 主观感知的情绪标签 */
  perceived: string
  /** SAM 自评 1–9 */
  valence: number
  arousal: number
  dominance: number
  /** 舒适度 1–5 */
  comfort?: number
  /** 实验条件：A 基线白光 / B 色彩光 / C 多模态 */
  condition?: "A" | "B" | "C" | ""
  respondent?: string
  note?: string
}

/** SAM 1–9 → PAD −1…1 */
export const samToPad = (
  r: Pick<FeedbackRecord, "valence" | "arousal" | "dominance">,
): Vec => ({
  p: (r.valence - 5) / 4,
  a: (r.arousal - 5) / 4,
  d: (r.dominance - 5) / 4,
})

export const DEFAULT_PRIOR_K = 10
export const MAX_FEEDBACK_WEIGHT = 0.85

export interface ItemStats {
  n: number
  mean: Vec
  sd: Vec
  /** 95% 置信区间半宽 */
  ci: Vec
  labels: { name: string ;
count: number ;
share: number }[]
  topLabel: string | null
  topShare: number
  /** 感知标签与模型标签一致的比例 */
  agreement: number
  /** 反馈在校准坐标中的权重 */
  weight: number
  calibrated: Vec
  calibratedTarget: string
  /** 最终采用标签：样本足够且多数一致时取多数感知标签，否则取校准坐标最近标签 */
  finalTarget: string
  finalBasis: "majority" | "calibrated" | "model"
  /** 模型坐标与反馈均值的 PAD 偏差 */
  delta: number
  comfort: number | null
  level: "L1" | "L2"
  conditions: Record<string, number>
}

export function itemStats(
  records: FeedbackRecord[],
  model: { v: Vec ;
target: string },
  k = DEFAULT_PRIOR_K,
): ItemStats {
  const n = records.length
  const pads = records.map(samToPad)
  const avg = (f: (v: Vec) => number) =>
    n ? pads.reduce((s, v) => s + f(v), 0) / n : 0
  const mean = { p: avg((v) => v.p), a: avg((v) => v.a), d: avg((v) => v.d) }
  const sdOf = (key: keyof Vec) =>
    n > 1
      ? Math.sqrt(
          pads.reduce((s, v) => s + (v[key] - mean[key]) ** 2, 0) / (n - 1),
        )
      : 0
  const sd = { p: sdOf("p"), a: sdOf("a"), d: sdOf("d") }
  const ci = {
    p: n ? (1.96 * sd.p) / Math.sqrt(n) : 0,
    a: n ? (1.96 * sd.a) / Math.sqrt(n) : 0,
    d: n ? (1.96 * sd.d) / Math.sqrt(n) : 0,
  }
  const counts = new Map<string, number>()
  records.forEach((r) =>
    counts.set(r.perceived, (counts.get(r.perceived) ?? 0) + 1),
  )
  const labels = [...counts]
    .map(([name, count]) => ({ name, count, share: count / n }))
    .sort((a, b) => b.count - a.count)
  // 可信度加权：模型相当于 k 位虚拟受访者；样本越多，反馈权重越高（上限 0.85，保留模型约束）
  const weight = n ? Math.min(MAX_FEEDBACK_WEIGHT, n / (n + k)) : 0
  const calibrated = {
    p: (1 - weight) * model.v.p + weight * mean.p,
    a: (1 - weight) * model.v.a + weight * mean.a,
    d: (1 - weight) * model.v.d + weight * mean.d,
  }
  const calibratedTarget = nearestTarget(calibrated)
  const top = labels[0]
  const majority = top && n >= 5 && top.share > 0.5
  const comforts = records
    .map((r) => r.comfort)
    .filter((c): c is number => typeof c === "number")
  const conditions: Record<string, number> = {}
  records.forEach((r) => {
    const c = r.condition || "未标注"
    conditions[c] = (conditions[c] ?? 0) + 1
  })
  return {
    n,
    mean,
    sd,
    ci,
    labels,
    topLabel: top?.name ?? null,
    topShare: top?.share ?? 0,
    agreement: n ? (counts.get(model.target) ?? 0) / n : 0,
    weight,
    calibrated: n ? calibrated : model.v,
    calibratedTarget: n ? calibratedTarget : model.target,
    finalTarget: majority ? top.name : n ? calibratedTarget : model.target,
    finalBasis: majority ? "majority" : n ? "calibrated" : "model",
    delta: n ? dist(model.v, mean) : 0,
    comfort: comforts.length
      ? comforts.reduce((s, c) => s + c, 0) / comforts.length
      : null,
    level: n >= 5 ? "L2" : "L1",
    conditions,
  }
}

/**
 * 来源权重拟合：在单纯形上网格搜索（步长 0.05）非负权重，
 * 使 Σ w_k · v_k 与各素材反馈均值的样本量加权平方误差最小。
 */
export function fitSourceWeights<K extends string>(
  samples: { vectors: Partial<Record<K, Vec>> ;
target: Vec ;
n: number }[],
  keys: K[],
): { weights: Record<K, number> ;
rmse: number ;
baseline?: number } | null {
  const usable = samples.filter((s) => keys.every((k) => s.vectors[k]))
  if (usable.length < 3) return null
  const step = 0.05
  const units = Math.round(1 / step)
  let best: { w: number[] ;
err: number } = {
    w: keys.map(() => 1 / keys.length),
    err: Infinity,
  }
  const rec = (i: number, left: number, acc: number[]) => {
    if (i === keys.length - 1) {
      const w = [...acc, left].map((u) => u / units)
      let err = 0,
        tot = 0
      for (const s of usable) {
        let p = 0,
          a = 0,
          d = 0
        keys.forEach((k, j) => {
          const v = s.vectors[k]!
          p += v.p * w[j]
          a += v.a * w[j]
          d += v.d * w[j]
        })
        err +=
          s.n *
          ((p - s.target.p) ** 2 +
            (a - s.target.a) ** 2 +
            (d - s.target.d) ** 2)
        tot += s.n
      }
      err /= tot
      if (err < best.err) best = { w, err }
      return
    }
    for (let u = 0; u <= left; u++) rec(i + 1, left - u, [...acc, u])
  }
  rec(0, units, [])
  return {
    weights: Object.fromEntries(
      keys.map((k, j) => [k, best.w[j]]),
    ) as Record<K, number>,
    rmse: Math.sqrt(best.err),
  }
}

/** 用给定权重计算误差，用于与拟合结果对照 */
export function weightError<K extends string>(
  samples: { vectors: Partial<Record<K, Vec>> ;
target: Vec ;
n: number }[],
  weights: Partial<Record<K, number>>,
) {
  let err = 0,
    tot = 0
  for (const s of samples) {
    const keys = Object.keys(weights) as K[]
    if (!keys.every((k) => s.vectors[k])) continue
    let p = 0,
      a = 0,
      d = 0
    keys.forEach((k) => {
      const v = s.vectors[k]!,
        w = weights[k]!
      p += v.p * w
      a += v.a * w
      d += v.d * w
    })
    err +=
      s.n *
      ((p - s.target.p) ** 2 + (a - s.target.a) ** 2 + (d - s.target.d) ** 2)
    tot += s.n
  }
  return tot ? Math.sqrt(err / tot) : null
}

// ── CSV ──
const CSV_HEAD = [
  "item",
  "perceived",
  "valence",
  "arousal",
  "dominance",
  "comfort",
  "condition",
  "respondent",
  "note",
  "at",
]
export function toCSV(records: FeedbackRecord[]) {
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [
    CSV_HEAD.join(","),
    ...records.map((r) =>
      CSV_HEAD.map((h) =>
        esc(
          h === "at"
            ? new Date(r.at).toISOString()
            : (r as unknown as Record<string, unknown>)[h],
        ),
      ).join(","),
    ),
  ].join("\n")
}
function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = [],
    cell = "",
    q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"'
        i++
      } else if (c === '"') q = false
      else cell += c
    } else if (c === '"') q = true
    else if (c === ",") {
      row.push(cell)
      cell = ""
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ""
    } else cell += c
  }
  if (cell || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows.filter((r) => r.some((x) => x.trim()))
}

const labelSet = new Set(emotionTargets.map((t) => t.name))
const uid = () =>
  `fb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

/** 校验并规范化导入记录；返回有效记录与错误说明 */
export function normalizeImport(
  raw: unknown[],
  knownItems: Set<string>,
): { ok: FeedbackRecord[] ;
errors: string[] } {
  const ok: FeedbackRecord[] = []
  const errors: string[] = []
  raw.forEach((r0, i) => {
    if (!r0 || typeof r0 !== "object" || Array.isArray(r0))
      return errors.push(`第 ${i + 1} 行：记录必须为对象`)
    const r = r0 as Record<string, unknown>
    const num = (k: string) =>
      r[k] == null || r[k] === "" ? NaN : Number(r[k])
    const item = String(r.item ?? "").trim()
    const perceived = String(r.perceived ?? "").trim()
    const v = num("valence"),
      a = num("arousal"),
      d = num("dominance")
    if (!knownItems.has(item))
      return errors.push(`第 ${i + 1} 行：未知素材 ${item || "(空)"}`)
    if (!labelSet.has(perceived))
      return errors.push(`第 ${i + 1} 行：未知情绪标签 ${perceived || "(空)"}`)
    if (![v, a, d].every((x) => Number.isInteger(x) && x >= 1 && x <= 9))
      return errors.push(`第 ${i + 1} 行：SAM 评分需为 1–9 整数`)
    const comfort =
      r.comfort === "" || r.comfort == null ? undefined : Number(r.comfort)
    if (
      comfort != null &&
      (!Number.isInteger(comfort) || comfort < 1 || comfort > 5)
    )
      return errors.push(`第 ${i + 1} 行：舒适度需为 1–5 整数`)
    const cond = String(r.condition ?? "").toUpperCase()
    if (cond && !["A", "B", "C"].includes(cond))
      return errors.push(`第 ${i + 1} 行：实验条件需为 A/B/C`)
    const at =
      typeof r.at === "number" ? r.at : r.at ? Date.parse(String(r.at)) : NaN
    if (
      r.at != null &&
      r.at !== "" &&
      (!Number.isFinite(at) || at < 0 || at > 8.64e15)
    )
      return errors.push(`第 ${i + 1} 行：日期无效`)
    ok.push({
      id: typeof r.id === "string" && r.id ? r.id : uid(),
      item,
      perceived,
      valence: v,
      arousal: a,
      dominance: d,
      comfort: Number.isFinite(comfort) ? comfort : undefined,
      condition: cond === "A" || cond === "B" || cond === "C" ? cond : "",
      respondent: r.respondent ? String(r.respondent) : undefined,
      note: r.note ? String(r.note) : undefined,
      at: Number.isFinite(at) ? at : Date.now(),
    })
  })
  return { ok, errors }
}

export function mergeFeedback(
  existing: FeedbackRecord[],
  incoming: FeedbackRecord[],
) {
  const ids = new Set(existing.map((r) => r.id))
  const key = (r: FeedbackRecord) =>
    JSON.stringify([
      r.item,
      r.at,
      r.perceived,
      r.valence,
      r.arousal,
      r.dominance,
      r.comfort ?? null,
      r.condition || "",
      r.respondent || "",
      r.note || "",
    ])
  const keys = new Set(existing.map(key))
  return [
    ...existing,
    ...incoming.filter((r) => {
      const k = key(r)
      if (ids.has(r.id) || keys.has(k)) return false
      ids.add(r.id)
      keys.add(k)
      return true
    }),
  ]
}

export function parseFeedbackFile(name: string, text: string): unknown[] {
  if (/\.json$/i.test(name)) {
    const j = JSON.parse(text.replace(/^\uFEFF/, ""))
    if (Array.isArray(j)) return j
    if (j && Array.isArray(j.records)) return j.records
    throw new Error("JSON 中缺少 records 数组")
  }
  const rows = parseCSV(text.replace(/^\uFEFF/, ""))
  if (!rows.length) return []
  const head = rows[0].map((h) => h.trim())
  return rows
    .slice(1)
    .map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""])))
}

// ── Context ──
interface FeedbackStore {
  coordinates: Record<string, Vec>
  setCoordinates: (id: string, v: Vec | null) => void
  records: FeedbackRecord[]
  byItem: Record<string, FeedbackRecord[]>
  priorK: number
  setPriorK: (k: number) => void
  add: (r: Omit<FeedbackRecord, "id" | "at">) => void
  remove: (id: string) => void
  clear: () => void
  importRecords: (rs: FeedbackRecord[]) => void
}
const Ctx = createContext<FeedbackStore | null>(null)
export const useFeedback = () => {
  const v = useContext(Ctx)
  if (!v) throw new Error("useFeedback must be used inside <FeedbackProvider>")
  return v
}

const KEY = "nvc-feedback"
const KKEY = "nvc-feedback-k"
const load = <T,>(key: string, fallback: T): T => {
  try {
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) as T : fallback
  } catch {
    return fallback
  }
}
const save = (key: string, v: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(v))
  } catch {
    // 存储不可用时仅本次会话生效
  }
}

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [coordinates, setCoordinatesState] = useState<Record<string, Vec>>({})
  const [records, setRecords] = useState<FeedbackRecord[]>(() => {
    const raw = load<unknown>(KEY, [])
    if (!Array.isArray(raw)) return []
    const known = new Set(
      raw.flatMap((r) => (r && typeof r.item === "string" ? [r.item] : [])),
    )
    return normalizeImport(raw, known).ok
  })
  const [priorK, setK] = useState<number>(() => {
    const k = load<unknown>(KKEY, DEFAULT_PRIOR_K)
    return typeof k === "number" && Number.isFinite(k)
      ? Math.round(clamp(k, 1, 50))
      : DEFAULT_PRIOR_K
  })
  const commit = useCallback(
    (f: (rs: FeedbackRecord[]) => FeedbackRecord[]) => {
      setRecords((rs) => {
        const next = f(rs)
        save(KEY, next)
        return next
      })
    },
    [],
  )
  const value = useMemo<FeedbackStore>(() => {
    const byItem: Record<string, FeedbackRecord[]> = {}
    records.forEach((r) => (byItem[r.item] ??= []).push(r))
    return {
      coordinates,
      setCoordinates: (id, v) => setCoordinatesState((prev) => {
        const next = { ...prev }
        if (v && [v.p, v.a, v.d].every((n) => Number.isFinite(n) && n >= -1 && n <= 1)) next[id] = { ...v }
        else if (v == null) delete next[id]
        return next
      }),
      records,
      byItem,
      priorK,
      setPriorK: (k) => {
        const v = Math.round(clamp(k, 1, 50))
        setK(v)
        save(KKEY, v)
      },
      add: (r) => commit((rs) => [...rs, { ...r, id: uid(), at: Date.now() }]),
      remove: (id) => commit((rs) => rs.filter((r) => r.id !== id)),
      clear: () => commit(() => []),
      importRecords: (add) => commit((rs) => mergeFeedback(rs, add)),
    }
  }, [records, priorK, commit, coordinates])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
