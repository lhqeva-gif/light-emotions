// 灯光实发数据共享层：预计算结果 + manifest 补放文件（浏览器内分析）+ 本次会话导入
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import {
  analyzeClip,
  applyGamma,
  gammaFitCurve,
  makeClip,
  parseName,
  type LedAnalysis,
  type LedClip,
  type LedMapping,
} from "./analyze/ledbin"
import { DRIVE_GAMMA, GAMMA_RANGE } from "./lightSource"
import { rankTargets } from "./emotion"
import preset from "./data/led-analyses.json"

export interface LabelOverride {
  target: string
  /** 次要情绪（最多 2 个） */
  secondary: string[]
  note?: string
  at: number
}

export type LedEntry = LedAnalysis & {
  src?: string
  fileName?: string
  uploaded?: boolean
  /** 人工修改的实发情绪标签 */
  manual?: LabelOverride
  /** 模型判定（人工修改前） */
  modelTarget?: string
  modelRanked?: { name: string ;
match: number }[]
}

export const BASE = import.meta.env.BASE_URL

let mappingPromise: Promise<LedMapping> | null = null
export const loadDefaultMapping = () =>
  (mappingPromise ??= fetch(`${BASE}led/dian.json`).then((r) => {
    if (!r.ok) throw new Error("默认走线 dian.json 加载失败")
    return r.json()
  }).catch((error) => { mappingPromise = null; throw error }))

export interface ManifestClip {
  file: string
  name?: string
  scene?: string | null
  fps?: number
}

// ── 验证状态 ──
export type ValidationKind = "aligned" | "near" | "drift" | "unlinked"
export const validationMeta: Record<ValidationKind | "missing" | "pending", {
  label: string
  color: string
  hint: string
}> = {
  aligned: {
    label: "模型对照 · 一致",
    color: "#6ee7b7",
    hint: "实发模型与设计模型 PAD 偏差 Δ ≤ 0.25；非心理效果实证",
  },
  near: {
    label: "模型对照 · 接近",
    color: "#a7d9ff",
    hint: "模型 PAD 偏差 0.25 < Δ ≤ 0.35；工程参考，非实证通过",
  },
  drift: {
    label: "偏离 · 待校准",
    color: "#fcd34d",
    hint: "偏差 Δ > 0.35，建议调整光色或动态",
  },
  unlinked: {
    label: "仅灯光数据",
    color: "#c4b5fd",
    hint: "未关联库内意境，仅以实发数据推断",
  },
  pending: {
    label: "分析中",
    color: "#ffffff",
    hint: "正在浏览器中解析 bin 文件",
  },
  missing: {
    label: "待补充 bin",
    color: "rgba(255,255,255,0.38)",
    hint: "尚未提供灯光实发数据",
  },
}
export function validationOf(e: LedEntry): ValidationKind {
  if (!e.design) return "unlinked"
  if (e.design.delta <= 0.25) return "aligned"
  if (e.design.delta <= 0.35) return "near"
  return "drift"
}

export interface ImportResult {
  ok: boolean
  text: string
  added: LedEntry[]
}

interface LedStore {
  entries: LedEntry[]
  /** 库内意境 id → 最新的实发数据 */
  byScene: Record<string, LedEntry>
  /** manifest 中待分析 / 分析中的文件 → 绑定的意境 id */
  pending: { file: string ;
scene: string | null }[]
  clips: Map<string, LedClip>
  mapping: { name: string ;
data: LedMapping } | null
  status: string | null
  /** 当前驱动 γ（全局，影响混色模型） */
  gamma: number
  setGamma: (g: number) => void
  gammaFit: ReturnType<typeof gammaFitCurve>
  /** 人工修改实发情绪标签；传 null 恢复模型判定 */
  setLabel: (id: string, o: Omit<LabelOverride, "at"> | null) => void
  importFiles: (
    files: File[],
    opts?: { sceneId?: string | null ;
fpsDefault?: number },
  ) => Promise<ImportResult>
}

const Ctx = createContext<LedStore | null>(null)

export function useLedStore() {
  const v = useContext(Ctx)
  if (!v) throw new Error("useLedStore must be used inside <LedProvider>")
  return v
}

const tick = () => new Promise((r) => setTimeout(r, 30))

async function parseMapping(f: File): Promise<LedMapping> {
  let data: unknown
  try {
    data = JSON.parse(await f.text())
  } catch {
    throw new Error(`${f.name} 不是有效的 JSON`)
  }
  const ok =
    Array.isArray(data) &&
    data.length > 0 &&
    data.every(
      (p) =>
        Array.isArray(p) &&
        p.length >= 2 &&
        Number.isInteger(p[0]) &&
        Number.isInteger(p[1]) &&
        p[0] >= 0 &&
        p[1] >= 0,
    )
  if (!ok) throw new Error(`${f.name} 格式应为 [[x, y], …] 的非负整数坐标数组`)
  return (data as number[][]).map((p) => [p[0], p[1]] as [number, number])
}

const GAMMA_KEY = "nvc-led-gamma"
const readGamma = () => {
  try {
    const v = Number(localStorage.getItem(GAMMA_KEY))
    return v >= GAMMA_RANGE.min && v <= GAMMA_RANGE.max ? v : DRIVE_GAMMA
  } catch {
    return DRIVE_GAMMA
  }
}

export function LedProvider({ children }: { children: React.ReactNode }) {
  const [gamma, setGammaState] = useState<number>(readGamma)
  const setGamma = useCallback((g: number) => {
    const v =
      Math.round(
        Math.min(GAMMA_RANGE.max, Math.max(GAMMA_RANGE.min, g)) * 100,
      ) / 100
    setGammaState(v)
    try {
      localStorage.setItem(GAMMA_KEY, String(v))
    } catch {
      // 忽略隐私模式等存储不可用
    }
  }, [])
  const LABEL_KEY = "nvc-led-labels"
  const [overrides, setOverrides] = useState<Record<string, LabelOverride>>(
    () => {
      try {
        return JSON.parse(localStorage.getItem(LABEL_KEY) ?? "{}")
      } catch {
        return {}
      }
    },
  )
  const setLabel = useCallback(
    (id: string, o: Omit<LabelOverride, "at"> | null) => {
      setOverrides((prev) => {
        const next = { ...prev }
        if (o)
          next[id] = {
            ...o,
            secondary: o.secondary.filter((x) => x !== o.target).slice(0, 2),
            at: Date.now(),
          }
        else delete next[id]
        try {
          localStorage.setItem(LABEL_KEY, JSON.stringify(next))
        } catch {
          // 存储不可用时仅本次会话生效
        }
        return next
      })
    },
    [],
  )
  const [baseEntries, setEntries] = useState<LedEntry[]>(
    preset as unknown as LedEntry[],
  )
  const [pending, setPending] = useState<{
    file: string
    scene: string | null
  }[]>([])
  const [mapping, setMapping] = useState<{
    name: string
    data: LedMapping
  } | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const clips = useRef(new Map<string, LedClip>()).current

  // ── manifest：补放的 bin 文件若无预计算结果，则在浏览器中依次分析 ──
  useEffect(() => {
    let alive = true
    ;(async () => {
      let list: ManifestClip[] = []
      try {
        const r = await fetch(`${BASE}led/manifest.json`, { cache: "no-cache" })
        if (!r.ok) return
        list = ((await r.json()) as { clips?: ManifestClip[] }).clips ?? []
      } catch {
        return
      }
      const known = preset as unknown as LedEntry[]
      const todo = list.filter((c) => {
        const p = known.find((e) => e.src === `led/${c.file}`)
        return !p || (c.scene != null && p.linkedId !== c.scene)
      })
      if (!todo.length || !alive) return
      setPending(todo.map((c) => ({ file: c.file, scene: c.scene ?? null })))
      const map = await loadDefaultMapping().catch(() => null)
      for (const c of todo) {
        if (!alive || !map) break
        await tick()
        try {
          const r = await fetch(`${BASE}led/${c.file}`)
          if (!r.ok) throw new Error()
          const fileName = c.name ?? c.file
          const pn = parseName(fileName)
          const clip = makeClip(
            pn.name,
            new Uint8Array(await r.arrayBuffer()),
            map,
            c.fps ?? pn.fps ?? 25,
          )
          const id = `led-${c.file.replace(/\.bin$/i, "")}`
          const a: LedEntry = {
            ...analyzeClip(clip, { id, fileName, linkId: c.scene ?? null }),
            src: `led/${c.file}`,
            fileName,
          }
          clips.set(id, clip)
          if (alive) setEntries((es) => [...es.filter((e) => e.id !== id), a])
        } catch {
          // 文件缺失或格式错误：保持“待补充”
        }
        if (alive) setPending((ps) => ps.filter((p) => p.file !== c.file))
      }
    })()
    return () => {
      alive = false
    }
  }, [clips])

  const importFiles = useCallback(
    async (
      files: File[],
      opts: { sceneId?: string | null ;
fpsDefault?: number } = {},
    ): Promise<ImportResult> => {
      const fpsDefault = opts.fpsDefault ?? 25
      const jsons = files.filter((f) => /\.json$/i.test(f.name))
      const bins = files.filter((f) => /\.bin$/i.test(f.name))
      const others = files.filter(
        (f) => !jsons.includes(f) && !bins.includes(f),
      )
      if (!jsons.length && !bins.length)
        return {
          ok: false,
          added: [],
          text: `不支持的文件：${others.map((f) => f.name).join("、")}，请选择 .bin 灯光数据或 .json 走线`,
        }
      const messages: string[] = []
      let map = mapping?.data ?? null
      try {
        if (jsons.length) {
          const j = jsons[jsons.length - 1]
          map = await parseMapping(j)
          setMapping({ name: j.name, data: map })
          messages.push(`已启用走线 ${j.name}（${map.length} 灯珠）`)
        }
        const added: LedEntry[] = []
        if (bins.length) {
          if (!map) setStatus("正在加载默认走线 dian.json …")
          const useMap: LedMapping = map ?? (await loadDefaultMapping())
          for (const f of bins) {
            setStatus(
              `正在解析 ${f.name}（${(f.size / 1024 / 1024).toFixed(1)} MB）…`,
            )
            await tick()
            const pn = parseName(f.name)
            const clip = makeClip(
              pn.name,
              new Uint8Array(await f.arrayBuffer()),
              useMap,
              pn.fps ?? fpsDefault,
            )
            const id = `up-${Date.now()}-${added.length}`
            const a = analyzeClip(clip, {
              fileName: f.name,
              id,
              linkId: opts.sceneId ?? null,
            })
            clips.set(id, clip)
            added.push({
              ...a,
              fileName: f.name,
              uploaded: true,
              review: pn.fps
                ? a.review
                : [`文件名未含帧率，按 ${fpsDefault} fps 解析`, ...a.review],
            })
          }
          setEntries((es) => [...es, ...added])
          messages.push(
            `已导入 ${added.map((a) => `${a.name}（${a.duration}s · ${a.target}）`).join("、")}`,
          )
        }
        if (others.length)
          messages.push(`已忽略 ${others.map((f) => f.name).join("、")}`)
        return { ok: true, added, text: messages.join("；") }
      } catch (e) {
        return {
          ok: false,
          added: [],
          text: e instanceof Error ? e.message : "解析失败",
        }
      } finally {
        setStatus(null)
      }
    },
    [mapping, clips],
  )

  // 按当前 γ 重算的条目（基础分析以 DRIVE_GAMMA 计算并附带驱动值分布）
  const entries = useMemo(
    () =>
      baseEntries.map((b) => {
        const e = applyGamma(b, gamma) as LedEntry
        const o = overrides[e.id]
        if (!o) return e
        const all = rankTargets(e.combined, 99)
        const matchOf = (n: string) =>
          all.find((r) => r.target.name === n)?.match ?? 0
        return {
          ...e,
          modelTarget: e.target,
          modelRanked: e.ranked,
          manual: o,
          target: o.target,
          ranked: [o.target, ...o.secondary].map((name) => ({
            name,
            match: matchOf(name),
          })),
        }
      }),
    [baseEntries, gamma, overrides],
  )
  const gammaFit = useMemo(
    () => gammaFitCurve(baseEntries, GAMMA_RANGE),
    [baseEntries],
  )

  const byScene = useMemo(() => {
    const m: Record<string, LedEntry> = {}
    for (const e of entries) if (e.linkedId) m[e.linkedId] = e // 后导入者覆盖
    return m
  }, [entries])

  const value = useMemo(
    () => ({
      entries,
      byScene,
      pending,
      clips,
      mapping,
      status,
      importFiles,
      gamma,
      setGamma,
      gammaFit,
      setLabel,
    }),
    [
      entries,
      byScene,
      pending,
      clips,
      mapping,
      status,
      importFiles,
      gamma,
      setGamma,
      gammaFit,
      setLabel,
    ],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

/** 批量拖拽 / 选择文件时统一的 File[] 复制（清空 input.value 会同步清空 FileList） */
export function snapshotFiles(list: FileList | null | undefined): File[] {
  return Array.from(list ?? [])
}
