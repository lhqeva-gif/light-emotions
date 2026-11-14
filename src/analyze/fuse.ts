// 多模态融合：画面语义 + 色彩参数 + 光环境参数 + 音乐参数 → PAD 情绪假设 → 光环境方案与报告
import {
  clamp,
  colorVec,
  dist,
  emotionProfiles,
  lightVec,
  nearestTarget,
  quadrant,
  type Vec,
} from "../emotion"
import type { MusicResult } from "./audio"
import { semanticElements, type SemanticTag, type VisualResult } from "./visual"

export type FusionSource = "semantic" | "color" | "light" | "music"
export const fusionLabels: Record<FusionSource, string> = {
  semantic: "画面语义",
  color: "色彩参数",
  light: "光环境",
  music: "音乐参数",
}
const baseWeights: Record<FusionSource, number> = {
  semantic: 0.35,
  color: 0.25,
  light: 0.15,
  music: 0.25,
}

export interface LightPlan {
  cct: number
  x: number
  y: number
  horizontalLux: number
  wallLux: number
  ra: string
  mr: number
  dynamicAmp: number
  dynamicPeriod: string
  pwm: string
  keyColors: string[]
}

export interface MusicPlan {
  bpm: string
  mode: string
  volume: string
  density: string
  natural: string
}

export interface FusionResult {
  vectors: Partial<Record<FusionSource, Vec>>
  weights: Partial<Record<FusionSource, number>>
  combined: Vec
  target: string
  quadrant: string
  confidence: number
  /** 音乐与画面一致性 0-100 */
  coherence: number | null
  light: LightPlan
  musicPlan: MusicPlan
  hypotheses: string[]
  indicators: string[]
  matches: { id: string ;
name: string ;
distance: number ;
dominant: string }[]
  review: string[]
  semanticSummary: string
}

/** CIE 1931 黑体轨迹近似（Kim et al. 2002） */
export function planckXY(T: number): [number, number] {
  const t = 1e3 / T,
    t2 = t * t,
    t3 = t2 * t
  const x =
    T <= 4000
      ? -0.2661239 * t3 - 0.234358 * t2 + 0.8776956 * t + 0.17991
      : -3.0258469 * t3 + 2.1070379 * t2 + 0.2226347 * t + 0.24039
  const x2 = x * x,
    x3 = x2 * x
  const y =
    T <= 2222
      ? -1.1063814 * x3 - 1.3481102 * x2 + 2.18555832 * x - 0.20219683
      : T <= 4000
        ? -0.9549476 * x3 - 1.37418593 * x2 + 2.09137015 * x - 0.16748867
        : 3.081758 * x3 - 5.8733867 * x2 + 3.75112997 * x - 0.37001483
  return [x, y]
}

function semanticVec(tags: SemanticTag[]): Vec | null {
  const sel = tags.filter((t) => t.selected)
  if (!sel.length) return null
  let p = 0,
    a = 0,
    d = 0,
    w = 0
  sel.forEach((t) => {
    const e = semanticElements.find((x) => x.id === t.id)!
    const wt = t.auto ? 0.5 + t.confidence : 1 // 人工确认的标签权重 1
    p += e.pad[0] * wt
    a += e.pad[1] * wt
    d += e.pad[2] * wt
    w += wt
  })
  return { p: p / w, a: a / w, d: d / w }
}

export function musicVec(m: MusicResult): Vec {
  const modeP =
    m.mode === "大调"
      ? 0.35
      : m.mode === "五声音阶"
        ? 0.3
        : m.mode === "小调"
          ? -0.15
          : 0.15
  const tempo = m.bpm ? clamp((m.bpm - 95) / 45) : -0.6
  const loud = clamp((m.loudness + 20) / 12)
  const cent = clamp((m.centroid - 1800) / 1500)
  const dens = clamp((m.density - 2) / 2.5)
  return {
    p: clamp(
      modeP +
        0.15 * cent -
        0.3 * (m.tension / 100 - 0.4) +
        0.15 * (m.natural / 100),
    ),
    a: clamp(0.35 * tempo + 0.25 * loud + 0.2 * dens + 0.2 * cent),
    d: clamp(0.5 * loud + 0.2 * tempo - 0.05),
  }
}

export function fuse(
  visual: VisualResult | null,
  music: MusicResult | null,
  tags: SemanticTag[],
): FusionResult | null {
  if (!visual && !music) return null
  const review: string[] = []
  const vectors: Partial<Record<FusionSource, Vec>> = {}

  const sem = visual ? semanticVec(tags) : null
  if (sem) vectors.semantic = sem
  else if (visual) review.push("未确认任何画面语义元素，语义维度未参与融合")

  let estCct = 4000
  if (visual) {
    vectors.color = colorVec(visual.color)
    estCct = Math.min(6500, Math.max(2700, visual.color.cct))
    const [lx, ly] = [visual.color.x, visual.color.y]
    vectors.light = lightVec({
      cct: estCct,
      lux: null,
      mr: 0.00013 * estCct + 0.15,
      cri: null,
      duv: null,
      x: lx,
      y: ly,
      measured: false,
    })
  }
  if (music) vectors.music = musicVec(music)

  const keys = Object.keys(vectors) as FusionSource[]
  const wsum = keys.reduce((s, k) => s + baseWeights[k], 0)
  const weights = Object.fromEntries(
    keys.map((k) => [k, baseWeights[k] / wsum]),
  ) as Partial<Record<FusionSource, number>>
  const combined = keys.reduce(
    (acc, k) => ({
      p: acc.p + vectors[k]!.p * weights[k]!,
      a: acc.a + vectors[k]!.a * weights[k]!,
      d: acc.d + vectors[k]!.d * weights[k]!,
    }),
    { p: 0, a: 0, d: 0 },
  )

  const spread =
    keys.length > 1
      ? keys.reduce((s, k) => s + dist(vectors[k]!, combined) * weights[k]!, 0)
      : 0.9
  const confidence =
    clamp(1 - spread / 1.2, 0, 1) * Math.min(1, 0.55 + keys.length * 0.12)

  const visualVec = vectors.semantic ?? vectors.color
  const coherence =
    music && visualVec
      ? Math.round(clamp(1 - dist(vectors.music!, visualVec) / 1.6, 0, 1) * 100)
      : null
  if (coherence != null && coherence < 50)
    review.push("音乐情绪与画面语义偏差较大，建议更换或调整音乐")
  if (visual?.tags.some((t) => t.id === "people" && t.selected && t.auto))
    review.push("“人物”为肤色区域推断，请人工确认")
  if (visual) review.push("画面语义为启发式识别，需人工确认标签")
  if (music?.mode === "环境音") review.push("调性不明显，按环境音处理")

  // ── 光环境方案 ──
  const A01 = (combined.a + 1) / 2
  const cct = visual ? estCct : Math.round(3000 + A01 * 3500)
  const planCct =
    Math.round(clamp(cct + combined.a * 400, 2700, 6500) / 50) * 50
  const [px, py] = planckXY(planCct)
  const horizontalLux = Math.round((150 + A01 * 350) / 10) * 10
  const dynamicAmp = Math.round(5 + A01 * 20)
  let dynamicPeriod: string
  if (music?.bpm && combined.a > 0.2)
    dynamicPeriod = `与节拍同步，8 拍一周期 ≈ ${((8 * 60) / music.bpm).toFixed(1)} s`
  else dynamicPeriod = `${Math.round(4 + (1 - A01) * 8)} 分钟呼吸式渐变`
  const keyColors = visual
    ? visual.kind === "video" && visual.keyframes
      ? [...new Set(visual.keyframes.map((k) => k.hex))].slice(0, 6)
      : visual.palette.slice(0, 4).map((c) => c.hex)
    : []

  const light: LightPlan = {
    cct: planCct,
    x: px,
    y: py,
    horizontalLux,
    wallLux: Math.round((horizontalLux * 0.4) / 10) * 10,
    ra: combined.p > 0.4 ? "Ra ≥ 90，R9 ≥ 50" : "Ra ≥ 90",
    mr: Math.round((0.00013 * planCct + 0.15) * 100) / 100,
    dynamicAmp,
    dynamicPeriod,
    pwm:
      combined.a > 0.3 || visual?.kind === "video"
        ? "≥ 3125 Hz（无可视频闪）"
        : "≥ 2000 Hz",
    keyColors,
  }

  // ── 音乐方案（推荐值，已上传音乐时给出调整方向）──
  const nat = tags.some(
    (t) => (t.id === "nature" || t.id === "water") && t.selected,
  )
  const recBpm = Math.round(60 + A01 * 60)
  const musicPlan: MusicPlan = {
    bpm: `${recBpm - 8}–${recBpm + 8}`,
    mode:
      combined.p > 0.35
        ? combined.a < 0
          ? "五声音阶 / 环境音"
          : "大调"
        : combined.a < 0
          ? "环境音"
          : "小调 → 大调过渡",
    volume: combined.a > 0.3 ? "55–65 dB" : "45–55 dB",
    density:
      combined.a > 0.3
        ? "中高节奏密度"
        : combined.a > -0.1
          ? "中等节奏密度"
          : "低节奏密度",
    natural: nat ? "30%–50%" : "10%–20%",
  }

  // ── 心理假设与验证指标 ──
  const H: Record<string, string[]> = {
    放松: ["提升放松感与舒适度", "降低紧张感与压力感", "轻度提升注意恢复能力"],
    疗愈: ["提升愉悦度与被抚慰感", "降低焦虑与压力感", "促进情绪恢复"],
    安眠: ["降低唤醒度与警觉水平", "缩短入睡准备时间", "提升睡前放松感"],
    冥想: ["提升内省与觉察水平", "降低心率与呼吸频率", "提升注意稳定性"],
    禅定: [
      "比较主观静心与放松评分",
      "记录呼吸频率变化（待实验验证）",
      "评估内省沉静感",
    ],
    宁静: ["提升平和感与稳定感", "降低环境干扰感", "延长安静停留时长"],
    释然: ["缓解郁结与疲劳感", "提升通透感与积极情绪恢复", "降低主观压力评分"],
    慵懒: ["解除防御与紧绷状态", "提升居家松弛与舒适感", "放缓呼吸节奏"],
    沉浸: ["提升沉浸感与专注投入", "降低外界干扰感", "延长注视与停留时长"],
    安全: ["提升空间安全感与控制感", "降低不确定感", "提升舒适度"],
    安心: [
      "增强被守护感与情绪稳定度",
      "降低陌生环境戒备感",
      "提升长时停留舒适度",
    ],
    温馨: ["提升归属感与亲近感", "促进柔和交流", "提升舒适度"],
    从容: ["提升情绪笃定感与掌控感", "降低决策焦躁度", "维持平稳专注状态"],
    清雅: ["营造东方留白审美意境", "平复浮躁情绪", "提升文化空间沉浸度"],
    清冷: ["提升冷静与理性感", "降低情绪起伏", "强化空间秩序感"],
    专注: ["提升注意力正确率", "缩短反应时", "维持适度唤醒"],
    梦幻: ["提升新奇感与想象力", "提升沉浸感", "增强记忆点"],
    空灵: ["消解空间压迫与边界感", "激发自由联想与发散思维", "提升轻盈愉悦感"],
    浪漫: ["提升愉悦度与亲密感", "促进情感交流", "延长停留时长"],
    社交活跃: ["提升愉悦度与社交意愿", "提升空间活跃氛围", "增加交流时长"],
    清醒: ["提升警觉与思维清晰度", "降低倦怠感", "缩短反应时"],
    舒畅: ["驱散燥热与沉闷感", "提升身心舒展度与轻快活力", "促进创意发散"],
    活力: ["提升唤醒度与积极情绪", "提升能量感", "缩短反应时"],
    绚烂: ["激发高光时刻情感共鸣", "提升视觉惊艳度与记忆深度", "强化仪式氛围"],
    欢庆: ["显著提升愉悦度与唤醒度", "增强群体情绪感染", "提升记忆点"],
    敬畏: ["提升震撼感与注意捕获", "增强仪式感", "降低自我关注"],
    警醒: ["显著提升唤醒度", "增强注意捕获", "需控制时长以避免压力感上升"],
    紧张: ["提升警觉与心率", "增强叙事张力", "需严格控时以避免压力累积"],
    孤寂: ["引发低落与疏离感", "增强叙事情绪对比", "不建议长时间使用"],
  }
  const target = nearestTarget(combined)
  const indicators = ["PAD 量表", "SAM", "舒适度量表", "HRV", "GSR"]
  if (["专注", "清醒", "活力", "欢庆", "警醒", "紧张", "敬畏"].includes(target))
    indicators.push("注意力正确率", "反应时")
  else indicators.push("放松感 / 压力感评分", "注意力反应时")
  if (visual?.kind === "video" || target === "沉浸")
    indicators.push("眼动注视时长")

  const matches = emotionProfiles
    .map((p) => ({
      id: p.id,
      name: p.name,
      distance: dist(p.combined, combined),
      dominant: p.colorParams.dominant,
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3)

  const semanticSummary =
    tags
      .filter((t) => t.selected)
      .map((t) => t.label)
      .join(" / ") || "未确认"

  return {
    vectors,
    weights,
    combined,
    target,
    quadrant: quadrant(combined).name,
    confidence,
    coherence,
    light,
    musicPlan,
    hypotheses: H[target] ?? [],
    indicators,
    matches,
    review,
    semanticSummary,
  }
}

const sign = (v: number) => (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(2)
export const warmText = (w: number) =>
  w > 0.25
    ? "暖"
    : w > 0.05
      ? "中性偏暖"
      : w > -0.05
        ? "中性"
        : w > -0.25
          ? "中性偏冷"
          : "冷"

export function reportText(
  f: FusionResult,
  v: VisualResult | null,
  m: MusicResult | null,
): string {
  const L: string[] = ["画面情绪光环境验证报告", ""]
  L.push(
    "素材：",
    `${v ? `${v.kind === "video" ? "视频" : "画面"} ${v.name}` : "无画面"}${
      m ? `；音乐 ${m.name}${m.origin === "video" ? "（视频原声）" : ""}` : ""
    }`,
    "",
  )
  if (v) {
    L.push("画面语义：", f.semanticSummary, "")
    const c = v.color
    L.push(
      "色彩参数：",
      `主色 ${c.dominant.toUpperCase()}`,
      `平均亮度 ${Math.round(c.brightness)}%`,
      `平均饱和度 ${Math.round(c.saturation)}%`,
      `明暗对比 ${Math.round(c.contrast)}`,
      `冷暖倾向：${warmText(c.warmth)}`,
      `色彩复杂度 ${Math.round(c.complexity)}`,
      `CIE xy：${c.x.toFixed(4)}, ${c.y.toFixed(4)}`,
      `目标 CCT：${f.light.cct}K`,
      `目标 Ra：90+`,
      `目标 MR：${f.light.mr}`,
    )
    if (v.kind === "video") L.push(`运动强度：${Math.round(v.motion ?? 0)}`)
    L.push("")
  }
  L.push("音乐参数：")
  if (m) {
    L.push(
      `BPM：${m.bpm ?? "无明显节拍"}`,
      `调式：${m.key} ${m.mode}`,
      `响度：${m.loudness.toFixed(1)} dBFS（播放建议 ${f.musicPlan.volume}）`,
      `频谱重心：${Math.round(m.centroid)} Hz`,
      `节奏密度：${m.density.toFixed(2)} 次/秒`,
      `和声紧张度：${m.tension}`,
      `自然声占比（估算）：${m.natural}%`,
    )
    if (f.coherence != null) L.push(`与画面语义一致性：${f.coherence}`)
  } else {
    L.push(
      `推荐 BPM：${f.musicPlan.bpm}`,
      `推荐调式：${f.musicPlan.mode}`,
      `音量：${f.musicPlan.volume}`,
      `${f.musicPlan.density}`,
      `自然声占比：${f.musicPlan.natural}`,
    )
  }
  L.push(
    "",
    "空间光环境：",
    `水平照度：${f.light.horizontalLux} lx`,
    `墙面照度：${f.light.wallLux} lx`,
    `光色 CIE xy：${f.light.x.toFixed(3)}, ${f.light.y.toFixed(3)}`,
    `显色：${f.light.ra}`,
    `亮度动态：±${f.light.dynamicAmp}%，${f.light.dynamicPeriod}`,
    `PWM 频率：${f.light.pwm}`,
  )
  if (f.light.keyColors.length)
    L.push(`动态主光色：${f.light.keyColors.join(" → ")}`)
  L.push(
    "",
    "情绪坐标：",
    `P ${sign(f.combined.p)} · A ${sign(f.combined.a)} · D ${sign(f.combined.d)}（${f.quadrant}）`,
    `情绪目标：${f.target}`,
    `多源一致性：${Math.round(f.confidence * 100)}%`,
  )
  L.push(
    "",
    "心理假设：",
    f.hypotheses.join("；") + "。",
    "",
    "验证指标：",
    f.indicators.join("、") + "。",
  )
  L.push("", "匹配库内意境：", f.matches.map((x) => x.name).join("、"))
  L.push("", "销售表达：", salesText(f), "", "证据等级：L1 · 理论推断")
  if (f.review.length)
    L.push("", "需人工确认：", ...f.review.map((r) => `· ${r}`))
  return L.join("\n")
}

export function salesText(f: FusionResult): string {
  const basis = [
    f.vectors.semantic && "画面语义",
    f.vectors.color && "色彩心理学",
    f.vectors.music && "音乐参数",
    "空间照明测量",
  ]
    .filter(Boolean)
    .join("、")
  return `该方案基于${basis}建立情绪假设，以 ${f.light.cct}K / ${f.light.horizontalLux} lx 光环境营造「${f.target}」型空间氛围，待通过主观量表与生理指标验证后升级证据等级。`
}
