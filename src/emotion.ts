// 情绪验证坐标模型
// 原则：不是“某个色值 = 某种情绪”，而是
//   画面语义（情绪关键词）+ 色彩参数 + 空间光环境参数 → 共同形成 PAD 情绪假设
// 所有坐标均为模型推断值（证据等级 L1），需经 A/B/C 对照实验的主观量表与生理指标回写校准。

import { scenes, type Band } from "./scenes"
import { proposalScenes } from "./proposal"

export type Vec = { p: number ;
a: number ;
d: number }
export type Source = "combined" | "semantic" | "color" | "light"

export const sourceLabels: Record<Source, string> = {
  combined: "综合坐标",
  semantic: "画面语义",
  color: "色彩参数",
  light: "光环境参数",
}

/** 融合权重：语义为主，色彩与光环境为辅 */
export const weights = { semantic: 0.5, color: 0.3, light: 0.2 }

// ── 情绪词 PAD 词库（-1 ~ 1），参考 PAD 情绪量表的中文情绪词标定思路 ──
const lexicon: Record<string, [number, number, number]> = {
  东方意境: [0.4, -0.4, 0.2],
  丰收: [0.75, 0.3, 0.4],
  丰盈: [0.65, 0.15, 0.35],
  丰盛: [0.7, 0.4, 0.35],
  亲密: [0.75, 0.25, 0.1],
  从容: [0.5, -0.5, 0.5],
  共鸣: [0.6, 0.45, 0.2],
  内敛: [0.25, -0.5, 0.3],
  内省: [0.2, -0.6, 0.25],
  凝思: [0.2, -0.45, 0.3],
  力量: [0.35, 0.8, 0.8],
  卸下: [0.5, -0.6, 0.2],
  告别: [0.0, -0.2, -0.1],
  和谐: [0.65, -0.3, 0.3],
  唤醒: [0.5, 0.65, 0.4],
  喜庆: [0.85, 0.7, 0.4],
  喜悦: [0.85, 0.6, 0.35],
  团圆: [0.85, 0.3, 0.3],
  围聚: [0.7, 0.2, 0.25],
  壮阔: [0.55, 0.5, 0.2],
  奇幻: [0.55, 0.45, -0.1],
  奢享: [0.7, 0.2, 0.5],
  孤高: [0.1, -0.2, 0.5],
  宁静: [0.6, -0.7, 0.3],
  守护: [0.6, -0.1, 0.4],
  安宁: [0.6, -0.7, 0.3],
  安定: [0.5, -0.6, 0.4],
  安心: [0.7, -0.5, 0.35],
  安眠: [0.5, -0.85, 0.1],
  安稳: [0.55, -0.6, 0.35],
  安适: [0.65, -0.55, 0.3],
  希望: [0.75, 0.4, 0.4],
  幽谧: [0.3, -0.6, 0.0],
  开阔: [0.65, 0.25, 0.5],
  归属: [0.7, -0.2, 0.3],
  律动: [0.4, 0.5, 0.3],
  微醺: [0.6, -0.2, 0.0],
  恬静: [0.6, -0.65, 0.3],
  惬意: [0.75, -0.4, 0.4],
  愉悦: [0.8, 0.35, 0.4],
  慵懒: [0.45, -0.75, 0.0],
  成熟: [0.45, -0.1, 0.55],
  抚慰: [0.6, -0.55, 0.0],
  敬畏: [0.25, 0.45, -0.5],
  新生: [0.7, 0.5, 0.3],
  明朗: [0.75, 0.35, 0.5],
  朦胧: [0.3, -0.45, -0.2],
  松弛: [0.6, -0.7, 0.3],
  柔软: [0.6, -0.55, -0.05],
  梦幻: [0.6, 0.15, -0.2],
  母爱: [0.85, 0.0, 0.2],
  永恒: [0.45, -0.45, 0.1],
  沉淀: [0.3, -0.65, 0.35],
  沉稳: [0.4, -0.5, 0.6],
  沉醉: [0.65, 0.1, -0.1],
  治愈: [0.7, -0.55, 0.15],
  浩瀚: [0.45, 0.4, -0.45],
  浪漫: [0.8, 0.4, 0.1],
  涟漪: [0.5, -0.1, 0.1],
  淡然: [0.4, -0.65, 0.4],
  深邃: [0.2, -0.3, -0.1],
  清冷: [0.05, -0.3, 0.3],
  清凉: [0.55, 0.1, 0.3],
  清新: [0.7, 0.25, 0.35],
  清雅: [0.55, -0.45, 0.35],
  温暖: [0.75, -0.1, 0.25],
  温柔: [0.7, -0.45, 0.1],
  激情: [0.6, 0.9, 0.55],
  灵动: [0.6, 0.4, 0.3],
  爆发: [0.35, 0.95, 0.6],
  独处: [0.25, -0.55, 0.3],
  珍藏: [0.6, -0.1, 0.3],
  甜梦: [0.6, -0.8, 0.0],
  甜蜜: [0.85, 0.35, 0.1],
  生机: [0.75, 0.55, 0.4],
  畅快: [0.75, 0.6, 0.5],
  祝福: [0.8, 0.25, 0.25],
  神秘: [0.2, 0.3, -0.35],
  禅意: [0.45, -0.7, 0.35],
  空灵: [0.45, -0.4, -0.05],
  精致: [0.6, 0.1, 0.45],
  纯净: [0.6, -0.4, 0.2],
  纯真: [0.75, 0.25, 0.0],
  绚烂: [0.75, 0.75, 0.35],
  绵长: [0.4, -0.55, 0.15],
  绽放: [0.8, 0.7, 0.45],
  美好: [0.8, 0.1, 0.3],
  自由: [0.8, 0.4, 0.7],
  舒展: [0.7, -0.15, 0.5],
  舒朗: [0.7, 0.0, 0.45],
  蓬勃: [0.75, 0.7, 0.5],
  觉知: [0.35, -0.2, 0.5],
  警醒: [-0.15, 0.85, 0.35],
  遐思: [0.45, -0.2, 0.0],
  遐想: [0.5, 0.0, 0.05],
  释然: [0.65, -0.5, 0.35],
  闲适: [0.65, -0.6, 0.4],
  隔绝: [-0.1, -0.5, 0.0],
  雀跃: [0.8, 0.75, 0.35],
  震撼: [0.15, 0.95, -0.3],
  静谧: [0.55, -0.75, 0.25],
}

// ── 情绪目标原型（用于输出“可讲清楚”的销售表达）──
// ── 情绪目标标签（PAD 原型 + 简短解释）──
// 原型已按融合坐标的实际收缩范围标定（多源加权平均会使坐标向中心靠拢）
export type TargetFamily = "舒缓" | "平衡" | "激活" | "警示"

export type TargetSubFamily = "深度静息·助眠" | "解压松弛·疗愈" | "温情归属·亲密" | "澄明专注·从容" | "艺术沉浸·遐想" | "元气唤醒·提神" | "欢聚共鸣·盛放" | "宏大敬畏·警醒"

export interface EmotionTarget {
  name: string
  family: TargetFamily
  subFamily: TargetSubFamily
  /** 典型光色基调倾向 */
  toneHint: string
  v: Vec
  /** 一句话解释：这种情绪是什么、光如何引发 */
  desc: string
  /** 典型适用场景 */
  use: string
}

export const emotionTargets: EmotionTarget[] = [
  // ── 1. 舒缓 · 深度静息·助眠（极低唤醒）──
  {
    name: "安眠",
    family: "舒缓",
    subFamily: "深度静息·助眠",
    toneHint: "微光暖珀 / 深邃星夜",
    v: { p: 0.3, a: -0.6, d: -0.05 },
    desc: "极低唤醒的静谧微光，降低警觉，帮助身体进入睡前状态。",
    use: "卧室 · 睡前过渡 · 午休舱",
  },
  {
    name: "冥想",
    family: "舒缓",
    subFamily: "深度静息·助眠",
    toneHint: "幽紫星夜 / 低照禅光",
    v: { p: 0.15, a: -0.42, d: 0.28 },
    desc: "低唤醒但保有内在掌控，注意力向内收拢，适合觉察与内省。",
    use: "冥想室 · 瑜伽 · 禅修",
  },
  {
    name: "禅定",
    family: "舒缓",
    subFamily: "深度静息·助眠",
    toneHint: "竹影青绿 / 水墨留白",
    v: { p: 0.36, a: -0.52, d: 0.34 },
    desc: "清寂澄明、呼吸深长，帮助思绪彻底沉淀，进入东方静心之境。",
    use: "茶席静坐 · 东方书房 · 静修馆",
  },

  // ── 2. 舒缓 · 解压松弛·疗愈（柔和低唤醒）──
  {
    name: "放松",
    family: "舒缓",
    subFamily: "解压松弛·疗愈",
    toneHint: "暮紫暖橙 / 柔白天光",
    v: { p: 0.5, a: -0.4, d: 0.2 },
    desc: "愉悦且低唤醒，肌肉与心率放缓，紧张感明显下降。",
    use: "休息区 · SPA · 下班减压",
  },
  {
    name: "疗愈",
    family: "舒缓",
    subFamily: "解压松弛·疗愈",
    toneHint: "柔暖暮色 / 极光柔绿",
    v: { p: 0.58, a: -0.22, d: 0.0 },
    desc: "温和愉悦、无需掌控，感到被抚慰与包容，利于情绪修复。",
    use: "康养 · 心理疏导 · 疗愈空间",
  },
  {
    name: "宁静",
    family: "舒缓",
    subFamily: "解压松弛·疗愈",
    toneHint: "柔白薄云 / 清雅竹林",
    v: { p: 0.38, a: -0.3, d: 0.3 },
    desc: "平和稳定、不被打扰，情绪既不高涨也不低落。",
    use: "阅读区 · 茶室 · 书房",
  },
  {
    name: "释然",
    family: "舒缓",
    subFamily: "解压松弛·疗愈",
    toneHint: "雨后初霁 / 通透新绿",
    v: { p: 0.62, a: -0.28, d: 0.32 },
    desc: "雨过天晴般的通透与卸压感，将郁结情绪转化为豁然舒朗。",
    use: "雨后过渡 · 情绪疏导 · 休憩廊",
  },
  {
    name: "慵懒",
    family: "舒缓",
    subFamily: "解压松弛·疗愈",
    toneHint: "夕照琥珀 / 暖绒微光",
    v: { p: 0.54, a: -0.48, d: 0.05 },
    desc: "松软惬意、慢节奏放空，卸下防备享受自在休憩。",
    use: "周末起居室 · 沙发小憩 · 慢咖啡",
  },

  // ── 3. 平衡 · 温情归属·亲密（高愉悦中唤醒）──
  {
    name: "温馨",
    family: "平衡",
    subFamily: "温情归属·亲密",
    toneHint: "琥珀暖光 / 围炉金黄",
    v: { p: 0.64, a: -0.04, d: 0.14 },
    desc: "亲近、归属与家的温度，促进陪伴和柔和交流。",
    use: "客厅 · 家庭餐厅 · 民宿",
  },
  {
    name: "浪漫",
    family: "平衡",
    subFamily: "温情归属·亲密",
    toneHint: "柔粉光晕 / 微醺紫橙",
    v: { p: 0.66, a: 0.14, d: -0.04 },
    desc: "愉悦且轻度心动，营造亲密、温柔的情感氛围。",
    use: "约会餐厅 · 纪念日 · 酒廊",
  },
  {
    name: "安心",
    family: "平衡",
    subFamily: "温情归属·亲密",
    toneHint: "柔和暖白 / 琥珀柔光",
    v: { p: 0.58, a: -0.14, d: 0.28 },
    desc: "柔和稳定的光感包裹，带来被守护的踏实与信赖。",
    use: "亲子空间 · 卧室伴睡 · 康养居所",
  },

  // ── 4. 平衡 · 澄明专注·从容（高控制中唤醒）──
  {
    name: "安全",
    family: "平衡",
    subFamily: "澄明专注·从容",
    toneHint: "均衡中性光 / 澄明天光",
    v: { p: 0.48, a: -0.08, d: 0.25 },
    desc: "环境稳定可预期，带来信赖与可控感，降低不确定焦虑。",
    use: "大堂 · 通道 · 公共接待",
  },
  {
    name: "专注",
    family: "平衡",
    subFamily: "澄明专注·从容",
    toneHint: "清爽中性白 / 晴空自然光",
    v: { p: 0.3, a: 0.15, d: 0.3 },
    desc: "适度唤醒并保持掌控感，注意力集中，利于工作与学习。",
    use: "办公 · 自习 · 会议",
  },
  {
    name: "从容",
    family: "平衡",
    subFamily: "澄明专注·从容",
    toneHint: "秋色金黄 / 柔白天光",
    v: { p: 0.46, a: -0.16, d: 0.44 },
    desc: "沉稳有度、不疾不徐，让情绪由躁动沉淀为成熟与笃定。",
    use: "深度洽谈 · 复盘总结 · 主管空间",
  },
  {
    name: "清雅",
    family: "平衡",
    subFamily: "澄明专注·从容",
    toneHint: "翠竹疏影 / 水墨淡彩",
    v: { p: 0.42, a: -0.22, d: 0.32 },
    desc: "疏影留白般的东方雅致，清凉克制而富有文化韵味。",
    use: "东方茶室 · 书画展厅 · 雅集空间",
  },

  // ── 5. 平衡 · 艺术沉浸·遐想（氛围包裹中唤醒）──
  {
    name: "沉浸",
    family: "平衡",
    subFamily: "艺术沉浸·遐想",
    toneHint: "深邃水墨 / 极光慢流",
    v: { p: 0.18, a: -0.12, d: 0.05 },
    desc: "注意力被氛围持续吸引，外界干扰减弱，容易忘却时间。",
    use: "展陈 · 观影 · 沉浸式空间",
  },
  {
    name: "梦幻",
    family: "平衡",
    subFamily: "艺术沉浸·遐想",
    toneHint: "淡彩弥散 / 星云粉紫",
    v: { p: 0.4, a: 0.2, d: -0.2 },
    desc: "轻度兴奋而掌控感低，引发奇幻、遐想与超现实体验。",
    use: "主题乐园 · 婚礼 · 艺术装置",
  },
  {
    name: "空灵",
    family: "平衡",
    subFamily: "艺术沉浸·遐想",
    toneHint: "晨雾淡彩 / 轻纱混色",
    v: { p: 0.44, a: -0.06, d: -0.08 },
    desc: "淡彩弥散消解具象边界，让思绪轻盈漂浮，进入纯净遐想。",
    use: "灵感孵化 · 数字艺术展 · 放空区",
  },
  {
    name: "清冷",
    family: "平衡",
    subFamily: "艺术沉浸·遐想",
    toneHint: "冰雪银白 / 高色温冷光",
    v: { p: 0.08, a: -0.2, d: 0.36 },
    desc: "冷静克制、带有距离感的理性氛围，情绪趋于收敛。",
    use: "高端零售 · 极简展陈 · 冬季主题",
  },

  // ── 6. 激活 · 元气唤醒·提神（中高唤醒高控制）──
  {
    name: "清醒",
    family: "激活",
    subFamily: "元气唤醒·提神",
    toneHint: "高色温晴空 / 晨间亮白",
    v: { p: 0.35, a: 0.32, d: 0.48 },
    desc: "提神醒脑、思维清晰，控制感强，帮助摆脱倦怠。",
    use: "晨间唤醒 · 早会 · 驾驶前",
  },
  {
    name: "活力",
    family: "激活",
    subFamily: "元气唤醒·提神",
    toneHint: "暖金初阳 / 明亮晴空",
    v: { p: 0.52, a: 0.45, d: 0.32 },
    desc: "能量感充沛、积极向上，身体更愿意行动。",
    use: "健身 · 运动 · 开工启动",
  },
  {
    name: "舒畅",
    family: "激活",
    subFamily: "元气唤醒·提神",
    toneHint: "青绿生机 / 碧波涟漪",
    v: { p: 0.62, a: 0.28, d: 0.38 },
    desc: "清凉通透、生机盎然，驱散沉闷并激发开放的创造力。",
    use: "创意工作坊 · 夏季消暑 · 开放协作",
  },

  // ── 7. 激活 · 欢聚共鸣·盛放（高愉悦高唤醒）──
  {
    name: "社交活跃",
    family: "激活",
    subFamily: "欢聚共鸣·盛放",
    toneHint: "暖橙明黄 / 明快混色",
    v: { p: 0.6, a: 0.2, d: 0.1 },
    desc: "愉悦而外向，提升交流意愿与空间人气。",
    use: "咖啡厅 · 聚会 · 共享空间",
  },
  {
    name: "欢庆",
    family: "激活",
    subFamily: "欢聚共鸣·盛放",
    toneHint: "炽烈暖红 / 斑斓花影",
    v: { p: 0.72, a: 0.52, d: 0.18 },
    desc: "高愉悦高唤醒的喜悦与热烈，情绪外放、彼此感染。",
    use: "节日 · 庆典 · 派对",
  },
  {
    name: "绚烂",
    family: "激活",
    subFamily: "欢聚共鸣·盛放",
    toneHint: "霞光万道 / 繁花盛放",
    v: { p: 0.68, a: 0.38, d: 0.28 },
    desc: "光影盛放、情感共鸣强烈，营造具有仪式感的高光时刻。",
    use: "新品发布 · 颁奖盛典 · 婚礼高潮",
  },

  // ── 8. 警示 · 宏大敬畏·警醒（强注意捕获 / 叙事张力）──
  {
    name: "敬畏",
    family: "警示",
    subFamily: "宏大敬畏·警醒",
    toneHint: "深邃星云 / 浩瀚极光",
    v: { p: 0.15, a: 0.5, d: -0.3 },
    desc: "面对宏大或神秘时的震撼，自我感缩小，注意力被强烈捕获。",
    use: "宗教空间 · 天象馆 · 大型演艺",
  },
  {
    name: "警醒",
    family: "警示",
    subFamily: "宏大敬畏·警醒",
    toneHint: "冷冽电光 / 骤明骤暗",
    v: { p: 0.05, a: 0.65, d: 0.3 },
    desc: "强唤醒与高警觉，迅速吸引注意，适合短时提示。",
    use: "安全提示 · 电竞对战 · 短时刺激",
  },
  {
    name: "紧张",
    family: "警示",
    subFamily: "宏大敬畏·警醒",
    toneHint: "高对比冷暗 / 频闪脉冲",
    v: { p: -0.25, a: 0.6, d: -0.05 },
    desc: "不悦且高度激活，带来压迫感与不安，长时间暴露会增加压力。",
    use: "惊悚体验 · 叙事冲突段落（需控时）",
  },
  {
    name: "孤寂",
    family: "警示",
    subFamily: "宏大敬畏·警醒",
    toneHint: "幽暗冷灰 / 寒夜孤光",
    v: { p: -0.2, a: -0.4, d: -0.15 },
    desc: "低愉悦低唤醒的疏离与落寞，易引发低落情绪。",
    use: "叙事情绪段落（不宜长期使用）",
  },
]

export const targetInfo = (name: string): EmotionTarget | undefined =>
  emotionTargets.find((t) => t.name === name)

/** 按 PAD 距离排序的情绪标签，附匹配度（高斯核归一化，0-100） */
export function rankTargets(
  v: Vec,
  n = 3,
): { target: EmotionTarget ;
match: number ;
distance: number }[] {
  const scored = emotionTargets.map((t) => {
    const d = dist(t.v, v)
    return { target: t, distance: d, w: Math.exp(-(d * d) / (2 * 0.14 * 0.14)) }
  })
  const total = scored.reduce((s, x) => s + x.w, 0) || 1
  return scored
    .sort((a, b) => a.distance - b.distance)
    .slice(0, n)
    .map((x) => ({
      target: x.target,
      distance: x.distance,
      match: Math.round((x.w / total) * 100),
    }))
}

const targets = emotionTargets

// ── 色彩工具 ──
export const clamp = (v: number, lo = -1, hi = 1) =>
  Math.min(hi, Math.max(lo, v))
const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace("#", "")
  return [0, 2, 4].map((i) =>
    parseInt(h.slice(i, i + 2), 16),
  ) as [number, number, number]
}
export const toLinear = (c: number) => {
  const s = c / 255
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}
export const fromLinear = (c: number) => {
  const s = c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055
  return Math.round(clamp(s, 0, 1) * 255)
}
export const linToXyz = ([r, g, b]: number[]) => [
  0.4124 * r + 0.3576 * g + 0.1805 * b,
  0.2126 * r + 0.7152 * g + 0.0722 * b,
  0.0193 * r + 0.1192 * g + 0.9505 * b,
]
export const xyzToLab = ([X, Y, Z]: number[]) => {
  const f = (t: number) =>
    t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116
  const fx = f(X / 0.95047),
    fy = f(Y),
    fz = f(Z / 1.08883)
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]
}
export const rgbToHsv = ([r, g, b]: number[]) => {
  const R = r / 255,
    G = g / 255,
    B = b / 255
  const max = Math.max(R, G, B),
    min = Math.min(R, G, B),
    d = max - min
  let h = 0
  if (d)
    h =
      max === R
        ? ((G - B) / d) % 6
        : max === G
          ? (B - R) / d + 2
          : (R - G) / d + 4
  return [(h * 60 + 360) % 360, max ? d / max : 0, max]
}
/** McCamy 近似：由 CIE xy 估算相关色温 */
export const mccamy = (x: number, y: number) => {
  const n = (x - 0.332) / (0.1858 - y)
  return 449 * n ** 3 + 3525 * n ** 2 + 6823.3 * n + 5520.33
}

export interface ColorParams {
  dominant: string
  rgb: [number, number, number]
  lab: [number, number, number]
  hsv: [number, number, number]
  /** 混光色（全部色彩按线性光叠加） */
  mix: string
  brightness: number // 0-100 平均亮度
  saturation: number // 0-100 饱和度均值
  contrast: number // 0-100 明暗对比
  warmth: number // -1 冷 ~ 1 暖
  complexity: number // 0-100 色彩复杂度
  x: number
  y: number
  cct: number
}

function analyzeColors(hexes: string[]): ColorParams {
  const rgbs = hexes.map(hexToRgb)
  const lins = rgbs.map((c) => c.map(toLinear))
  const labs = lins.map((l) => xyzToLab(linToXyz(l)))
  const hsvs = rgbs.map(rgbToHsv)

  // 主色：彩度 × 明度最高者
  let di = 0
  labs.forEach((l, i) => {
    const score = Math.hypot(l[1], l[2]) * (0.4 + l[0] / 100)
    const best =
      Math.hypot(labs[di][1], labs[di][2]) * (0.4 + labs[di][0] / 100)
    if (score > best) di = i
  })

  const mixLin = [0, 1, 2].map(
    (k) => lins.reduce((s, l) => s + l[k], 0) / lins.length,
  )
  const [X, Y, Z] = linToXyz(mixLin)
  const x = X / (X + Y + Z),
    y = Y / (X + Y + Z)

  const Ls = labs.map((l) => l[0])
  const brightness = Ls.reduce((s, v) => s + v, 0) / Ls.length
  const saturation = (hsvs.reduce((s, h) => s + h[1], 0) / hsvs.length) * 100
  const contrast = Math.max(...Ls) - Math.min(...Ls)
  // 冷暖：以橙色（约 35°）为最暖、蓝色（约 215°）为最冷，按饱和度加权
  const warmth =
    hsvs.reduce(
      (s, [h, sat]) => s + Math.cos(((h - 35) * Math.PI) / 180) * sat,
      0,
    ) / hsvs.length
  // 复杂度：色相离散度（圆周方差）× 饱和度
  const cx = hsvs.reduce(
    (s, [h, sat]) => s + Math.cos((h * Math.PI) / 180) * sat,
    0,
  )
  const cy = hsvs.reduce(
    (s, [h, sat]) => s + Math.sin((h * Math.PI) / 180) * sat,
    0,
  )
  const sw = hsvs.reduce((s, h) => s + h[1], 0) || 1
  const complexity =
    (1 - Math.hypot(cx, cy) / sw) * 100 * Math.min(1, hexes.length / 3)

  const toHex = (l: number[]) =>
    "#" + l.map((c) => fromLinear(c).toString(16).padStart(2, "0")).join("")

  return {
    dominant: hexes[di].toLowerCase(),
    rgb: rgbs[di],
    lab: labs[di].map((v) => Math.round(v)) as [number, number, number],
    hsv: [
      Math.round(hsvs[di][0]),
      Math.round(hsvs[di][1] * 100),
      Math.round(hsvs[di][2] * 100),
    ],
    mix: toHex(mixLin.map((v) => v / Math.max(...mixLin))),
    brightness,
    saturation,
    contrast,
    warmth: clamp(warmth),
    complexity,
    x,
    y,
    cct: Math.round(clamp(mccamy(x, y), 1800, 12000) / 10) * 10,
  }
}

export interface LightParams {
  cct: number
  lux: number | null
  /** 彩光实测或混色模型光通量 lm（若有） */
  flux?: number | null
  /** LED 平均输出亮度或画面平均亮度 0–100%（若有） */
  brightness?: number | null
  mr: number
  cri: number | null
  duv: number | null
  x: number
  y: number
  /** true = 来自实测报告；false = 由色彩板估算 */
  measured: boolean
}

export interface EmotionProfile {
  id: string
  name: string
  band: Band
  accent: string
  keywords: string[]
  semantic: Vec
  color: Vec
  light: Vec
  combined: Vec
  colorParams: ColorParams
  lightParams: LightParams
  target: string
  /** 0-1，三组变量方向一致性 */
  confidence: number
  review: string[]
}

export function semanticVec(keywords: string[], review: string[]): Vec {
  const hits = keywords.map((k) => lexicon[k]).filter(Boolean)
  keywords
    .filter((k) => !lexicon[k])
    .forEach((k) => review.push(`情绪词「${k}」未入词库`))
  if (!hits.length) return { p: 0, a: 0, d: 0 }
  const avg = (i: number) => hits.reduce((s, h) => s + h[i], 0) / hits.length
  return { p: avg(0), a: avg(1), d: avg(2) }
}

/** 自发光展示场景的工程启发式；并非对 Valdez & Mehrabian (1994) 回归的复现，系数尚待实验标定。 */
export function colorVec(c: ColorParams): Vec {
  const B = c.brightness / 100,
    S = c.saturation / 100
  return {
    p: clamp((0.69 * B + 0.22 * S - 0.42) / 0.4),
    // 这是待验证的正向明度修正假设，不代表普适心理规律。
    a: clamp(
      (0.24 * (B - 0.52) + 0.55 * S - 0.16) / 0.35 +
        c.warmth * 0.24 +
        (c.contrast / 100 - 0.4) * 0.35,
    ),
    d: clamp((-0.76 * B + 0.32 * S + 0.3) / 0.4),
  }
}

/** 光环境工程假设：参考 CCT、MR 和可用光量。lm/lx/画面明度不可直接换算；归一化常数不是实验分档标准。 */
export function lightVec(l: LightParams): Vec {
  const cctA = clamp((l.cct - 5200) / 3500)
  const mrA = clamp((l.mr - 0.9) / 0.4)
  const luxA =
    l.lux == null ? null : clamp(Math.log10(Math.max(200, l.lux) / 2200) / 0.35)
  const fluxA =
    l.flux == null
      ? null
      : clamp(Math.log10(Math.max(500, l.flux) / 8800) / 0.42)
  const briA = l.brightness == null ? null : clamp((l.brightness - 55) / 28)
  // 综合光强唤醒项：优先参考实测光通量（lm）与输出/画面亮度（%），其次参考照度（lx）
  const intensityA =
    fluxA != null && briA != null
      ? 0.6 * fluxA + 0.4 * briA
      : fluxA != null
        ? fluxA
        : luxA != null && briA != null
          ? 0.55 * luxA + 0.45 * briA
          : (luxA ?? briA ?? 0)
  // 微光场景减弱色温项的启发式修正；不据此推断真实生理响应。
  const dimScale = intensityA < 0 ? Math.max(0.3, 1 + intensityA * 0.65) : 1
  const cri = l.cri ?? 90
  const duv = l.duv ?? 0
  return {
    p: clamp(0.55 - Math.abs(l.cct - 4800) / 7000 + (cri - 90) / 15 - duv * 25),
    a: clamp(
      0.32 * cctA * dimScale + 0.23 * mrA * dimScale + 0.45 * intensityA,
    ),
    d: clamp(
      0.25 +
        (l.lux == null ? 0 : (l.lux - 2500) / 3000) * 0.5 +
        (cri - 90) / 20 -
        Math.abs(cctA) * 0.2,
    ),
  }
}

const mix = (s: Vec, c: Vec, l: Vec): Vec => ({
  p: s.p * weights.semantic + c.p * weights.color + l.p * weights.light,
  a: s.a * weights.semantic + c.a * weights.color + l.a * weights.light,
  d: s.d * weights.semantic + c.d * weights.color + l.d * weights.light,
})
export const dist = (u: Vec, v: Vec) =>
  Math.hypot(u.p - v.p, u.a - v.a, u.d - v.d)

function build(
  base: {
    id: string
    name: string
    band: Band
    accent: string
    keywords: string[]
  },
  hexes: string[],
  light: (c: ColorParams) => LightParams,
): EmotionProfile {
  const review: string[] = []
  const colorParams = analyzeColors(hexes)
  const lightParams = light(colorParams)
  const s = semanticVec(base.keywords, review)
  const c = colorVec(colorParams)
  const l = lightVec(lightParams)
  const combined = mix(s, c, l)
  // 一致性：色彩与光环境推断离语义假设越近，置信度越高
  const spread =
    (dist(s, c) * weights.color + dist(s, l) * weights.light) /
    (weights.color + weights.light)
  const confidence = clamp(1 - spread / 1.8, 0, 1)
  if (!lightParams.measured) review.push("光环境参数由色彩板估算，需空间实测")
  if (dist(s, c) > 1.1) review.push("色彩推断与语义假设偏差较大")
  if (Math.sign(s.a) !== Math.sign(l.a) && Math.abs(s.a - l.a) > 0.8)
    review.push("光色唤醒度与语义方向相反")
  const target = targets.reduce((best, t) =>
    dist(t.v, combined) < dist(best.v, combined) ? t : best,
  ).name
  return {
    ...base,
    semantic: s,
    color: c,
    light: l,
    combined,
    colorParams,
    lightParams,
    target,
    confidence,
    review,
  }
}

const hexesIn = (s: string) => s.match(/#[0-9a-f]{6}/gi) ?? []

export const emotionProfiles: EmotionProfile[] = [
  ...scenes.map((sc) =>
    build(
      {
        id: sc.id,
        name: sc.name,
        band: sc.band,
        accent: sc.accent,
        keywords: sc.emotion.keywords,
      },
      hexesIn(sc.gradient),
      // 白光模式的照度与色温来自同一组测量；不混入另一彩光模式的通量或画面 L*。
      () => ({ ...sc.metrics, flux: null, brightness: null, measured: true }),
    ),
  ),
  ...proposalScenes.map((ps) =>
    build(
      {
        id: ps.id,
        name: ps.name,
        band: ps.band,
        accent: ps.palette[0],
        keywords: ps.emotion.keywords,
      },
      ps.palette,
      (c) => ({
        // 可调白光 LED 的目标色温限定在 2200–8000K
        cct: Math.min(8000, Math.max(2200, c.cct)),
        lux: null,
        flux: null,
        brightness: c.brightness,
        // MR 与 CCT 在实测样本中近似线性（MR ≈ 0.00013·CCT + 0.15）
        mr:
          Math.round(
            (0.00013 * Math.min(8000, Math.max(2200, c.cct)) + 0.15) * 1000,
          ) / 1000,
        cri: null,
        duv: null,
        x: c.x,
        y: c.y,
        measured: false,
      }),
    ),
  ),
]

export const profileById = Object.fromEntries(
  emotionProfiles.map((p) => [p.id, p]),
) as Record<string, EmotionProfile>

export function quadrant(v: Vec): { name: string ;
hint: string } {
  if (v.p >= 0 && v.a >= 0)
    return { name: "愉悦 · 激活", hint: "活力 / 兴奋 / 社交" }
  if (v.p >= 0) return { name: "愉悦 · 舒缓", hint: "放松 / 治愈 / 安宁" }
  if (v.a >= 0) return { name: "不悦 · 激活", hint: "紧张 / 警醒" }
  return { name: "不悦 · 低唤醒", hint: "低落 / 疏离" }
}

export function nearestTarget(v: Vec): string {
  return targets.reduce((best, t) =>
    dist(t.v, v) < dist(best.v, v) ? t : best,
  ).name
}
