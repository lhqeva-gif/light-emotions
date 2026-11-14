// 统一素材目录：模型情绪（灯光实发优先，否则设计意图）+ 用户反馈统计 + 生效情绪（反馈校准）
import { useMemo } from "react"
import {
  clamp,
  profileById,
  rankTargets,
  targetInfo,
  type EmotionProfile,
  type TargetFamily,
  type TargetSubFamily,
  type Vec,
} from "./emotion"
import {
  itemStats,
  samToPad,
  useFeedback,
  type FeedbackRecord,
  type ItemStats,
} from "./feedback"
import { useLedStore, type LedEntry } from "./ledStore"
import { proposalScenes } from "./proposal"
import { scenes, type Band } from "./scenes"
import { FULL_FLUX } from "./lightSource"
import { overrideModel } from './coordinateModel'

export type ArousalBand = "low" | "mid" | "high"

export const arousalBandLabels: Record<ArousalBand, string> = {
  low: "低唤醒",
  mid: "中唤醒",
  high: "高唤醒",
}

export const arousalBandOf = (a: number): ArousalBand =>
  a < -0.2 ? "low" : a < 0.2 ? "mid" : "high"

/** 9 个细分情绪基调（在 暖调·唤醒 / 中性·平衡 / 冷调·沉静 三大主基调下按光色与唤醒特征细分） */
export type SubBand = "warm-dawn" | "warm-amber" | "warm-dusk" | "neutral-vital" | "neutral-soft" | "neutral-sky" | "cool-clear" | "cool-night" | "cool-storm"

export const subBandMeta: Record<SubBand, {
  parent: Band
  label: string
  color: string
  hint: string
}> = {
  "warm-dawn": {
    parent: "warm",
    label: "暖金 · 晨曦唤醒",
    color: "#ffb347",
    hint: "初阳、破晓与欢聚金光 · 高唤醒激活",
  },
  "warm-amber": {
    parent: "warm",
    label: "琥珀 · 醇厚温润",
    color: "#e8a13a",
    hint: "秋色、围炉与醇厚暖光 · 温情从容",
  },
  "warm-dusk": {
    parent: "warm",
    label: "暮橙 · 松弛治愈",
    color: "#e07b54",
    hint: "夕照余晖与暮紫柔光 · 低唤醒减压",
  },
  "neutral-vital": {
    parent: "neutral",
    label: "青绿 · 自然生机",
    color: "#8fd14f",
    hint: "春林、翠竹与雨后初霁 · 清新舒畅",
  },
  "neutral-soft": {
    parent: "neutral",
    label: "柔彩 · 浪漫空灵",
    color: "#f48fb1",
    hint: "粉紫、霞光与淡彩弥散 · 亲密遐想",
  },
  "neutral-sky": {
    parent: "neutral",
    label: "柔白 · 澄明闲适",
    color: "#a7d9ff",
    hint: "柔亮天光与薄云微风 · 稳定松弛",
  },
  "cool-clear": {
    parent: "cool",
    label: "晴蓝 · 清朗提神",
    color: "#4a95e8",
    hint: "万里晴空与碧波涟漪 · 明朗清醒",
  },
  "cool-night": {
    parent: "cool",
    label: "幽紫 · 星夜冥想",
    color: "#9c6ade",
    hint: "星云、极光与静谧紫调 · 深邃内省",
  },
  "cool-storm": {
    parent: "cool",
    label: "冷冽 · 律动警醒",
    color: "#7f9cf5",
    hint: "水墨律动与雷霆电光 · 张力与震撼",
  },
}

export const subFamilyMeta: Record<TargetSubFamily, {
  parent: TargetFamily
  label: TargetSubFamily
  color: string
  hint: string
}> = {
  深度静息·助眠: {
    parent: "舒缓",
    label: "深度静息·助眠",
    color: "#7da8ff",
    hint: "安眠 / 冥想 / 禅定 · 极低唤醒静心",
  },
  解压松弛·疗愈: {
    parent: "舒缓",
    label: "解压松弛·疗愈",
    color: "#9dc2ff",
    hint: "放松 / 疗愈 / 宁静 / 释然 / 慵懒",
  },
  温情归属·亲密: {
    parent: "平衡",
    label: "温情归属·亲密",
    color: "#f4a2b8",
    hint: "温馨 / 浪漫 / 安心 · 亲近陪伴",
  },
  澄明专注·从容: {
    parent: "平衡",
    label: "澄明专注·从容",
    color: "#8ce0aa",
    hint: "安全 / 专注 / 从容 / 清雅 · 稳定可控",
  },
  艺术沉浸·遐想: {
    parent: "平衡",
    label: "艺术沉浸·遐想",
    color: "#b8a9f8",
    hint: "沉浸 / 梦幻 / 空灵 / 清冷 · 氛围抽离",
  },
  元气唤醒·提神: {
    parent: "激活",
    label: "元气唤醒·提神",
    color: "#ffbe64",
    hint: "清醒 / 活力 / 舒畅 · 提神赋能",
  },
  欢聚共鸣·盛放: {
    parent: "激活",
    label: "欢聚共鸣·盛放",
    color: "#ff9254",
    hint: "社交活跃 / 欢庆 / 绚烂 · 热烈外放",
  },
  宏大敬畏·警醒: {
    parent: "警示",
    label: "宏大敬畏·警醒",
    color: "#ff7f7f",
    hint: "敬畏 / 警醒 / 紧张 / 孤寂 · 强注意捕获",
  },
}

function resolveSubBand(
  band: Band,
  v: Vec,
  hue: number,
  brightness: number,
  saturation: number,
): SubBand {
  if (band === "warm") {
    if (v.a >= 0.16) return "warm-dawn"
    if (v.a >= -0.18) return "warm-amber"
    return "warm-dusk"
  }
  if (band === "neutral") {
    // 色相直接来自素材，不再用 CCT 或情绪值猜测“青绿/柔粉”。
    if (saturation < 20) return "neutral-sky"
    if (hue >= 65 && hue < 175) return "neutral-vital"
    if (hue >= 270 || hue < 65) return "neutral-soft"
    return "neutral-sky"
  }
  // cool
  if (v.a >= 0.35 && brightness < 45) return "cool-storm"
  if (brightness >= 62 || (v.p >= 0.32 && v.a >= 0.02)) return "cool-clear"
  if (v.p < 0.25 && v.a >= -0.05) return "cool-storm"
  return "cool-night"
}

export interface ArousalEval {
  /** 当前生效唤醒度指标值 A（-1 ~ +1） */
  a: number
  /** 当前唤醒度划分档位 */
  band: ArousalBand
  label: string
  /** 光通量 lm（彩光实测或 LED 混色模型，若有） */
  flux: number | null
  /** LED 相对输出或画面 L*，不将两种不同量纲混合 */
  brightness: number
  brightnessKind: "LED 相对输出" | "画面明度 L*"
  /** LED 平均输出亮度 %（0–100，若有） */
  luminance: number | null
  /** 画面平均亮度 %（0–100） */
  visualBrightness: number
  /** 白光综合照度 lx（若有） */
  lux: number | null
  /** 参考光通量 / 亮度计算的基准唤醒度指标值 refA */
  refA: number
  /** 光通量 / 亮度参考档位 */
  refBand: ArousalBand
  refLabel: string
  /** 光通量 / 亮度核心参考值文案 */
  basisLabel: string
  /** 启发式参考吻合分数，不是实验准确率 */
  consistencyScore: number
  /** 未校准模型 vs 每条原始 SAM 反馈的分档一致率；无反馈时为 null */
  feedbackAccuracy: number | null
  feedbackCorrect: number
  feedbackN: number
  feedbackMae: number | null
  /** 当前划分是否与光通量/亮度参考基准一致 */
  matched: boolean
}

export interface CatalogItem {
  id: string
  name: string
  kind: "mood" | "proposal" | "led"
  band: Band
  subBand: SubBand
  subBandLabel: string
  accent: string
  /** 色温（彩光实测 > 白光实测 > 估算） */
  cct: number | null
  /** 光通量 lm（优先采用彩光实测或 LED 实发/模型） */
  flux: number | null
  fluxSource: "measured" | "model" | null
  /** 综合参考亮度 %（0–100） */
  brightness: number
  /** 白光综合照度 lx（若有） */
  lux: number | null
  design: EmotionProfile | null
  led: LedEntry | null
  model: { v: Vec ;
target: string ;
basis: "design" | "led" ;
manual: boolean }
  stats: ItemStats
  effective: {
    v: Vec
    target: string
    family: TargetFamily
    subFamily: TargetSubFamily
    secondary: { name: string ;
match: number ;
subFamily: TargetSubFamily }[]
    basis: "model" | "feedback"
  }
  /** 唤醒度划分指标值与准确率评估（参考光通量或亮度） */
  arousal: ArousalEval
}

export function evaluateItemArousal(opts: {
  effectiveA: number
  modelA: number
  flux: number | null
  luminance: number | null
  visualBrightness: number
  lux: number | null
  design: EmotionProfile | null
  led: LedEntry | null
  records: FeedbackRecord[]
}): ArousalEval {
  const {
    effectiveA: a,
    modelA,
    flux,
    luminance,
    visualBrightness,
    lux,
    design,
    led,
    records,
  } = opts
  const brightness = Math.round(luminance ?? visualBrightness)
  const brightnessKind = luminance != null ? "LED 相对输出" : "画面明度 L*"
  const band = arousalBandOf(a)

  // 1. 光通量（lm）与亮度（%）/ 照度（lx）物理唤醒项
  // 仅相对于本灯具 RGB 满载通量归一化；lm 不能直接换算为 lx 或 cd/m²。
  const fluxA = flux != null ? clamp((2 * flux) / FULL_FLUX - 1) : null
  // 当存在强动态闪烁（如雷霆闪电峰值亮度高、突变频繁）时，采用峰值亮度修正物理亮度唤醒项
  const effLum =
    led && (led.emission.eventsPerMin >= 2 || led.emission.fluctuation >= 35)
      ? Math.max(brightness, led.emission.peakLuminance * 0.85)
      : brightness
  const briA = clamp(effLum / 50 - 1)
  const opticalA = fluxA ?? briA

  // 2. 结合光通量/亮度主锚点与色彩饱和/动态速率形成参考唤醒度指标值 refA
  const dynA = led?.vectors.dynamic?.a ?? null
  const semA = led?.vectors.semantic?.a ?? design?.semantic.a ?? 0
  const colA = led?.vectors.color?.a ?? design?.color.a ?? 0
  const refA = clamp(
    dynA != null
      ? 0.48 * opticalA + 0.24 * dynA + 0.16 * colA + 0.12 * semA
      : 0.52 * opticalA + 0.26 * colA + 0.22 * semA,
  )
  const refBand = arousalBandOf(refA)

  const diff = Math.abs(a - refA)
  const matched = band === refBand
  const consistencyScore = Math.round(clamp(1 - diff / 2, 0, 1) * 100)
  const feedbackN = records.length
  const feedbackCorrect = records.filter(
    (r) => arousalBandOf(samToPad(r).a) === arousalBandOf(modelA),
  ).length
  const feedbackAccuracy = feedbackN
    ? Math.round((100 * feedbackCorrect) / feedbackN)
    : null
  const feedbackMae = feedbackN
    ? records.reduce((s, r) => s + Math.abs(modelA - samToPad(r).a), 0) /
      feedbackN
    : null

  const basisLabel =
    flux != null
      ? `光通量 ${Math.round(flux)} lm · ${brightnessKind} ${brightness}${
          luminance != null ? "%" : ""
        }`
      : `${brightnessKind} ${brightness}${
          luminance != null ? "%" : ""
        } · 无光通量实测`

  return {
    a,
    band,
    label: arousalBandLabels[band],
    flux: flux != null ? Math.round(flux) : null,
    brightness,
    brightnessKind,
    luminance: luminance != null ? Math.round(luminance * 10) / 10 : null,
    visualBrightness: Math.round(visualBrightness),
    lux: lux != null ? Math.round(lux) : null,
    refA,
    refBand,
    refLabel: arousalBandLabels[refBand],
    basisLabel,
    consistencyScore,
    feedbackAccuracy,
    feedbackN,
    feedbackCorrect,
    feedbackMae,
    matched,
  }
}

export interface ArousalSummary {
  total: number
  matchedCount: number
  /** 档位划分一致率 % */
  divisionConsistency: number | null
  /** 启发式模型间吻合分数，不代表准确率 */
  meanConsistency: number | null
  withFluxCount: number
  /** 用户反馈 SAM 唤醒度一致率 %（若有反馈） */
  feedbackAccuracy: number | null
  feedbackN: number
  byBand: Record<ArousalBand, {
    band: ArousalBand
    label: string
    rangeText: string
    refRule: string
    count: number
    meanA: number
    meanFlux: number | null
    meanBrightness: number
    consistencyScore: number | null
  }>
}

export function summarizeArousal(items: CatalogItem[]): ArousalSummary {
  const total = items.length
  const matchedCount = items.filter((i) => i.arousal.matched).length
  const divisionConsistency = total
    ? Math.round((matchedCount / total) * 100)
    : null
  const meanConsistency = total
    ? Math.round(
        items.reduce((s, i) => s + i.arousal.consistencyScore, 0) / total,
      )
    : null
  const withFluxCount = items.filter((i) => i.flux != null).length
  const feedbackN = items.reduce((s, i) => s + i.arousal.feedbackN, 0)
  const feedbackAccuracy = feedbackN
    ? Math.round(
        (100 * items.reduce((s, i) => s + i.arousal.feedbackCorrect, 0)) /
          feedbackN,
      )
    : null

  const meta: Record<ArousalBand, { rangeText: string ;
refRule: string }> = {
    low: {
      rangeText: "A < −0.20",
      refRule: "低唤醒模型分档，光量与动态仅作参考",
    },
    mid: {
      rangeText: "−0.20 ≤ A < +0.20",
      refRule: "中唤醒模型分档，不等同于照度阈值",
    },
    high: { rangeText: "A ≥ +0.20", refRule: "高唤醒模型分档，需主观反馈验证" },
  }

  const byBand = Object.fromEntries(
    (["low", "mid", "high"] as ArousalBand[]).map((b) => {
      const sub = items.filter((i) => i.arousal.band === b)
      const fluxItems = sub.filter((i) => i.flux != null)
      return [
        b,
        {
          band: b,
          label: arousalBandLabels[b],
          rangeText: meta[b].rangeText,
          refRule: meta[b].refRule,
          count: sub.length,
          meanA: sub.length
            ? sub.reduce((s, i) => s + i.arousal.a, 0) / sub.length
            : 0,
          meanFlux: fluxItems.length
            ? Math.round(
                fluxItems.reduce((s, i) => s + i.flux!, 0) / fluxItems.length,
              )
            : null,
          meanBrightness: sub.length
            ? Math.round(
                sub.reduce((s, i) => s + i.arousal.brightness, 0) / sub.length,
              )
            : 0,
          consistencyScore: sub.length
            ? Math.round(
                sub.reduce((s, i) => s + i.arousal.consistencyScore, 0) /
                  sub.length,
              )
            : null,
        },
      ]
    }),
  ) as ArousalSummary["byBand"]

  return {
    total,
    matchedCount,
    divisionConsistency,
    meanConsistency,
    withFluxCount,
    feedbackAccuracy,
    feedbackN,
    byBand,
  }
}

/** 与 UI 共用的纯计算入口，供数据校验和回归测试使用。 */
export function buildCatalog(
  entries: LedEntry[],
  byItem: Record<string, FeedbackRecord[]> = {},
  priorK = 10,
  coordinates: Record<string, Vec> = {},
) {
  const byScene: Record<string, LedEntry> = {}
  entries.forEach((e) => {
    if (e.linkedId) byScene[e.linkedId] = e
  })
  const make = (
    base: Omit<CatalogItem, "model" | "stats" | "effective" | "arousal" | "brightness" | "subBand" | "subBandLabel">,
    luminance: number | null,
    visualBrightness: number,
    saturation: number,
  ): CatalogItem => {
    const led = base.led
    const baseModel = led
      ? {
          v: led.combined,
          target: led.target,
          basis: "led" as const,
          manual: !!led.manual,
        }
      : {
          v: base.design!.combined,
          target: base.design!.target,
          basis: "design" as const,
          manual: false,
        }
    const model = overrideModel(baseModel, coordinates[base.id])
    const stats = itemStats(byItem[base.id] ?? [], model, priorK)
    const target = stats.n ? stats.finalTarget : model.target
    const effectiveV = stats.n ? stats.calibrated : model.v
    const tInfo = targetInfo(target)
    const family: TargetFamily = tInfo?.family ?? "平衡"
    const subFamily: TargetSubFamily = tInfo?.subFamily ?? "澄明专注·从容"
    const ranked = rankTargets(effectiveV, 99)
    const secondary =
      led?.manual && !stats.n
        ? led.manual.secondary
            .filter((name) => name !== target && targetInfo(name))
            .slice(0, 2)
            .map((name) => ({
              name,
              match: ranked.find((r) => r.target.name === name)?.match ?? 0,
              subFamily: targetInfo(name)!.subFamily,
            }))
        : ranked
            .filter((r) => r.target.name !== target)
            .slice(0, 2)
            .map((r) => ({
              name: r.target.name,
              match: r.match,
              subFamily: r.target.subFamily,
            }))
    const arousal = evaluateItemArousal({
      effectiveA: effectiveV.a,
      modelA: model.v.a,
      flux: base.flux,
      luminance,
      visualBrightness,
      lux: base.lux,
      design: base.design,
      led,
      records: byItem[base.id] ?? [],
    })
    const hue = led?.color.hsv[0] ?? base.design?.colorParams.hsv[0] ?? 0
    const subBand = resolveSubBand(
      base.band,
      effectiveV,
      hue,
      arousal.brightness,
      saturation,
    )
    return {
      ...base,
      subBand,
      subBandLabel: subBandMeta[subBand].label,
      brightness: arousal.brightness,
      model,
      stats,
      effective: {
        v: effectiveV,
        target,
        family,
        subFamily,
        secondary,
        basis: stats.n ? "feedback" : "model",
      },
      arousal,
    }
  }
  const items: CatalogItem[] = [
    ...scenes.map((s) => {
      const led = byScene[s.id] ?? null
      const des = profileById[s.id]
      return make(
        {
          id: s.id,
          name: s.name,
          kind: "mood",
          band: s.band,
          accent: s.accent,
          cct: led?.emission.cct ?? s.colorLight?.cct ?? s.metrics.cct,
          flux: led?.emission.flux ?? s.colorLight?.flux ?? null,
          fluxSource: led
            ? led.emission.source
            : s.colorLight
              ? "measured"
              : null,
          lux: s.metrics.lux,
          design: des,
          led,
        },
        led?.emission.luminance ?? null,
        led?.color.brightness ?? des.colorParams.brightness,
        led?.color.saturation ?? des.colorParams.saturation,
      )
    }),
    ...proposalScenes.map((s) => {
      const led = byScene[s.id] ?? null
      const des = profileById[s.id]
      return make(
        {
          id: s.id,
          name: s.name,
          kind: "proposal",
          band: s.band,
          accent: s.palette[0],
          cct: led?.emission.cct ?? des.lightParams.cct,
          flux: led?.emission.flux ?? null,
          fluxSource: led?.emission.source ?? null,
          lux: null,
          design: des,
          led,
        },
        led?.emission.luminance ?? null,
        led?.color.brightness ?? des.colorParams.brightness,
        led?.color.saturation ?? des.colorParams.saturation,
      )
    }),
    ...entries
      .filter((e) => !e.linkedId)
      .map((e) =>
        make(
          {
            id: e.id,
            name: e.name,
            kind: "led",
            band:
              e.color.warmth > 0.1
                ? "warm"
                : e.color.warmth < -0.1
                  ? "cool"
                  : "neutral",
            accent: e.emission.meanHex,
            cct: e.emission.cct,
            flux: e.emission.flux,
            fluxSource: e.emission.source,
            lux: null,
            design: null,
            led: e,
          },
          e.emission.luminance,
          e.color.brightness,
          e.color.saturation,
        ),
      ),
  ]
  return { items, byId: Object.fromEntries(items.map((i) => [i.id, i])) }
}

export function useCatalog(): {
  items: CatalogItem[]
  byId: Record<string, CatalogItem>
} {
  const { entries } = useLedStore()
  const { byItem, priorK, coordinates } = useFeedback()
  return useMemo(
    () => buildCatalog(entries, byItem, priorK, coordinates),
    [entries, byItem, priorK, coordinates],
  )
}

// ── 细分维度 ──
export type GroupDim = "band" | "subBand" | "family" | "subFamily" | "target" | "arousal" | "valence" | "cct" | "basis"

export const groupDims: { id: GroupDim ;
label: string ;
hint: string }[] = [
  { id: "band", label: "情绪基调", hint: "暖调·唤醒 / 中性·平衡 / 冷调·沉静" },
  {
    id: "subBand",
    label: "细分基调",
    hint: "9 个光色情绪细分基调（暖金/琥珀/暮橙/青绿/柔彩/柔白/晴蓝/幽紫/冷冽）",
  },
  { id: "family", label: "情绪类别", hint: "舒缓 / 平衡 / 激活 / 警示" },
  {
    id: "subFamily",
    label: "细分类别",
    hint: "8 个细分情绪类别（深度静息 / 解压松弛 / 温情归属 / 澄明专注 / 艺术沉浸 / 元气唤醒 / 欢聚共鸣 / 宏大敬畏）",
  },
  { id: "target", label: "情绪目标", hint: "29 个细分情绪目标标签" },
  {
    id: "arousal",
    label: "唤醒度",
    hint: "按 PAD 唤醒度 A 分段（参考光通量与亮度）",
  },
  { id: "valence", label: "愉悦度", hint: "按 PAD 愉悦度 P 分段" },
  { id: "cct", label: "色温段", hint: "彩光实测优先，其次白光实测 / 估算" },
  {
    id: "basis",
    label: "数据依据",
    hint: "设计意图 / 灯光实发 / 用户反馈校准",
  },
]

export interface GroupValue {
  key: string
  label: string
  color: string
  hint?: string
}

const FAMILY_COLORS: Record<TargetFamily, string> = {
  舒缓: "#8fb8ff",
  平衡: "#9fe0b0",
  激活: "#ffb45e",
  警示: "#ff7f7f",
}

export const dimValues: Record<Exclude<GroupDim, "target">, GroupValue[]> = {
  band: [
    { key: "warm", label: "暖调 · 唤醒", color: "#ff9d3d" },
    { key: "neutral", label: "中性 · 平衡", color: "#8fd14f" },
    { key: "cool", label: "冷调 · 沉静", color: "#4a95e8" },
  ],
  subBand: (Object.keys(subBandMeta) as SubBand[]).map((k) => ({
    key: k,
    label: subBandMeta[k].label,
    color: subBandMeta[k].color,
    hint: subBandMeta[k].hint,
  })),
  family: (["舒缓", "平衡", "激活", "警示"] as TargetFamily[]).map((f) => ({
    key: f,
    label: f,
    color: FAMILY_COLORS[f],
  })),
  subFamily: (Object.keys(subFamilyMeta) as TargetSubFamily[]).map((k) => ({
    key: k,
    label: subFamilyMeta[k].label,
    color: subFamilyMeta[k].color,
    hint: subFamilyMeta[k].hint,
  })),
  arousal: [
    {
      key: "low",
      label: "低唤醒",
      color: "#8fb8ff",
      hint: "A < −0.20 · 模型分档，非光通量阈值",
    },
    {
      key: "mid",
      label: "中唤醒",
      color: "#9fe0b0",
      hint: "−0.20 ≤ A < 0.20 · 模型分档",
    },
    {
      key: "high",
      label: "高唤醒",
      color: "#ffb45e",
      hint: "A ≥ 0.20 · 模型分档，需反馈验证",
    },
  ],
  valence: [
    {
      key: "neg",
      label: "偏低愉悦",
      color: "#ff7f7f",
      hint: "P < 0.2 · 中性 / 警示",
    },
    { key: "mid", label: "愉悦", color: "#a7d9ff", hint: "0.2 ≤ P < 0.5" },
    { key: "high", label: "高愉悦", color: "#ffd36e", hint: "P ≥ 0.5" },
  ],
  cct: [
    { key: "warm", label: "暖光 < 3300K", color: "#ffb45e" },
    { key: "neutral", label: "中性 3300–5300K", color: "#ffe8b8" },
    { key: "cool", label: "冷白 5300–8000K", color: "#cfe2ff" },
    { key: "blue", label: "高色温 ≥ 8000K", color: "#7fb0ff" },
  ],
  basis: [
    {
      key: "design",
      label: "设计意图",
      color: "rgba(255,255,255,0.6)",
      hint: "尚无灯光实发数据",
    },
    {
      key: "led",
      label: "灯光实发",
      color: "#c4b5fd",
      hint: "由 bin 数据推断",
    },
    {
      key: "feedback",
      label: "反馈校准",
      color: "#6ee7b7",
      hint: "已融合用户反馈",
    },
  ],
}

export function groupKey(item: CatalogItem, dim: GroupDim): string {
  const v = item.effective.v
  switch (dim) {
    case "band":
      return item.band
    case "subBand":
      return item.subBand
    case "family":
      return item.effective.family
    case "subFamily":
      return item.effective.subFamily
    case "target":
      return item.effective.target
    case "arousal":
      return v.a < -0.2 ? "low" : v.a < 0.2 ? "mid" : "high"
    case "valence":
      return v.p < 0.2 ? "neg" : v.p < 0.5 ? "mid" : "high"
    case "cct": {
      const c = item.cct ?? 5000
      return c < 3300
        ? "warm"
        : c < 5300
          ? "neutral"
          : c < 8000
            ? "cool"
            : "blue"
    }
    case "basis":
      return item.effective.basis === "feedback" ? "feedback" : item.model.basis
  }
}
