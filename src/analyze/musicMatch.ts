// 匹配音乐：由情绪坐标 + 情绪标签 + 灯光动态推导音乐规格；并对上传音乐做符合度检验
import { clamp, dist, targetInfo, type Vec } from '../emotion'
import type { MusicResult } from './audio'
import { musicVec } from './fuse'

export type ScaleMode = '大调' | '小调' | '五声音阶' | '环境音'

export interface MusicSpec {
  target: string
  bpm: [number, number]
  mode: ScaleMode
  key: string
  volume: [number, number] // dB SPL
  density: '低' | '中' | '中高' | '高'
  densityRate: [number, number] // 起音 / 秒
  natural: [number, number] // %
  tension: [number, number] // 0-100
  centroid: [number, number] // Hz
  timbre: string
  genre: string
  natureSound: string
  sync: string[]
  /** 推荐依据的 PAD（人工标签时取标签原型） */
  basis: Vec
  basisLabel: string
}

const palette: Record<string, { timbre: string; genre: string; nature: string }> = {
  放松: { timbre: '钢琴 · 弦乐长音 · 柔和合成 Pad', genre: '新世纪 / 轻古典', nature: '微风、远处溪流' },
  疗愈: { timbre: '竖琴 · 颂钵 · 温暖弦乐', genre: '疗愈氛围 / 冥想音乐', nature: '流水、鸟鸣' },
  安眠: { timbre: '低频 Pad · 慢速钢琴单音 · 粉红噪声', genre: '助眠环境音', nature: '细雨、海浪' },
  冥想: { timbre: '颂钵 · 持续音 Drone · 尺八', genre: '冥想 / 禅修音乐', nature: '山风、寺钟余韵' },
  禅定: { timbre: '古琴 · 尺八 · 颂钵泛音', genre: '东方禅乐 / 留白器乐', nature: '竹露滴水、山谷微风' },
  宁静: { timbre: '古筝 · 钢琴 · 木吉他泛音', genre: '东方轻音乐 / 极简钢琴', nature: '竹林风声、虫鸣' },
  释然: { timbre: '清亮钢琴 · 木吉他分解和弦 · 长笛', genre: '清新器乐 / 治愈民谣', nature: '雨停屋檐滴水、林间鸟鸣' },
  慵懒: { timbre: '暖色电钢琴 · 刷子鼓 · 低音提琴', genre: '慵懒波萨诺瓦 / 沙发音乐', nature: '午后微风、咖啡杯轻响' },
  沉浸: { timbre: '氛围合成器 · 颗粒质感 · 长混响', genre: '氛围电子 Ambient', nature: '空间环境底噪' },
  安全: { timbre: '原声吉他 · 暖色钢琴 · 大提琴', genre: '原声民谣 / 轻爵士', nature: '室内壁炉、远处人声' },
  安心: { timbre: '大提琴独奏 · 温暖钢琴 · 柔和弦乐', genre: '温情古典 / 摇篮曲风', nature: '壁炉微声、夜风轻拂' },
  温馨: { timbre: '原声吉他 · 钢琴 · 口哨/钟琴点缀', genre: '温暖民谣 / 家庭流行', nature: '炉火噼啪、杯盏轻响' },
  从容: { timbre: '大提琴 · 钢琴中音区 · 木管', genre: '室内乐 / 沉稳爵士', nature: '秋叶沙沙、微风' },
  清雅: { timbre: '古筝 · 箫 · 空灵打击点缀', genre: '新中式雅乐', nature: '翠竹轻摇、溪流潺潺' },
  清冷: { timbre: '钢片琴 · 冷色合成器 · 玻璃质感', genre: '极简电子 / 冷氛围', nature: '冬风、冰晶碰撞' },
  专注: { timbre: '极简钢琴 · 柔和电钢 · 轻鼓', genre: 'Lo-fi / 极简主义', nature: '轻雨、白噪声' },
  梦幻: { timbre: '钟琴 · 竖琴琶音 · 混响合成器', genre: '梦幻流行 Dream Pop', nature: '风铃、星空环境音' },
  空灵: { timbre: '泛音竖琴 · 空气感合成 Pad · 玻璃琴', genre: '空灵环境音乐', nature: '晨雾微风、远处水声' },
  浪漫: { timbre: '弦乐 · 萨克斯 · 钢琴', genre: '爵士抒情 / 波萨诺瓦', nature: '海浪、晚风' },
  社交活跃: { timbre: '电钢琴 · 贝斯 · 轻打击', genre: '城市流行 / 轻爵士', nature: '咖啡馆氛围' },
  清醒: { timbre: '明亮钢琴 · 拨弦 · 清脆打击', genre: '晨间器乐 / 轻电子', nature: '晨鸟、溪流' },
  舒畅: { timbre: '木吉他扫弦 · 明亮长笛 · 轻快打击', genre: '自然轻快器乐', nature: '碧波涟漪、林间清风' },
  活力: { timbre: '合成贝斯 · 鼓组 · 明亮合成器', genre: '流行电子 / 律动', nature: '—' },
  绚烂: { timbre: '弦乐群 · 竖琴华彩 · 铜管与打击', genre: '交响流行 / 盛典配乐', nature: '庆典氛围声' },
  欢庆: { timbre: '铜管 · 打击乐 · 合唱', genre: '节庆 / 民族欢歌', nature: '人群欢呼' },
  敬畏: { timbre: '管风琴 · 合唱 · 低频鼓', genre: '史诗配乐 / 宗教合唱', nature: '雷声、山谷回响' },
  警醒: { timbre: '打击乐 · 冲击音效 · 铜管强奏', genre: '电影配乐（高潮段）', nature: '雷暴' },
  紧张: { timbre: '不协和弦乐 · 低频脉冲', genre: '悬疑配乐', nature: '风暴、低频轰鸣' },
  孤寂: { timbre: '独奏大提琴 · 空旷钢琴', genre: '后古典 / 叙事配乐', nature: '空旷风声' },
}

export function recommendMusic(
  v: Vec,
  target: string,
  opts: { manual?: boolean; keywords?: string[]; period?: number | null; events?: number; eventsPerMin?: number; changeRate?: number; duration?: number } = {},
): MusicSpec {
  // 人工标签：以标签原型作为推荐依据，使音乐随人工判断更新
  const info = targetInfo(target)
  const basis = opts.manual && info ? info.v : v
  const A01 = (basis.a + 1) / 2
  let bpm = Math.round(56 + A01 * 70)
  if (target === '安眠') bpm = Math.min(bpm, 58)
  if (target === '欢庆' || target === '活力') bpm = Math.max(bpm, 110)
  const mode: ScaleMode =
    target === '冥想' || target === '安眠' || target === '沉浸'
      ? '环境音'
      : basis.p < 0
        ? '小调'
        : basis.p > 0.35 && basis.a < -0.05
          ? '五声音阶'
          : basis.p > 0.3
            ? '大调'
            : basis.a > 0.35
              ? '小调'
              : '环境音'
  const key = mode === '小调' ? 'A 小调' : mode === '五声音阶' ? 'D 宫调式（五声）' : mode === '大调' ? (basis.a > 0.3 ? 'D 大调' : 'F 大调') : 'C 持续音'
  const density = basis.a > 0.45 ? '高' : basis.a > 0.15 ? '中高' : basis.a > -0.2 ? '中' : '低'
  const densityRate: [number, number] =
    density === '高' ? [3.5, 6] : density === '中高' ? [2, 3.5] : density === '中' ? [1, 2] : [0.2, 1]
  const natureWords = ['自然', '清新', '生机', '宁静', '清凉', '静谧', '禅意', '治愈', '幽谧', '空灵']
  const nat = (opts.keywords ?? []).some((k) => natureWords.includes(k)) || ['放松', '疗愈', '安眠', '冥想', '宁静'].includes(target)
  const tensionC = Math.round(clamp(35 - basis.p * 40 + Math.max(0, basis.a) * 30, 5, 95))
  const p = palette[target] ?? palette['沉浸']

  const beatSec = 60 / bpm
  const sync: string[] = []
  if (opts.period) {
    const bars = Math.max(1, Math.round(opts.period / (beatSec * 4)))
    sync.push(`乐句长度对齐亮度呼吸周期 ${opts.period}s ≈ ${bars} 小节（4/4 拍）`)
  } else {
    sync.push(`灯光非周期变化：以 ${Math.round(beatSec * 16)}s（4 小节）为乐句单元，渐强渐弱跟随亮度包络`)
  }
  if (opts.events) sync.push(`灯光共有 ${opts.events} 次突变（${opts.eventsPerMin}/min）：在突变点安排重音 / 打击乐 / 低频冲击`)
  if (opts.changeRate != null) sync.push(opts.changeRate > 6 ? '灯光变化较快：使用持续律动，避免长时间静默' : '灯光变化平缓：以长音、慢速琶音为主，减少突兀音头')
  if (opts.duration) sync.push(`曲长与灯光循环 ${opts.duration}s 对齐，首尾做无缝循环淡化`)

  return {
    target,
    bpm: [bpm - 6, bpm + 6],
    mode,
    key,
    volume: basis.a > 0.3 ? [55, 65] : basis.a > -0.2 ? [48, 58] : [40, 50],
    density,
    densityRate,
    natural: nat ? [30, 50] : [5, 20],
    tension: [Math.max(0, tensionC - 12), Math.min(100, tensionC + 12)],
    centroid: [Math.round(700 + A01 * 1800), Math.round(1100 + A01 * 2400)],
    timbre: p.timbre,
    genre: p.genre,
    natureSound: p.nature,
    sync,
    basis,
    basisLabel: opts.manual ? `人工标签「${target}」原型` : '实发情绪坐标',
  }
}

export interface MusicCheck {
  score: number // 0-100 综合符合度
  emotion: number // 0-100 情绪坐标一致性
  items: { label: string; value: string; expect: string; ok: boolean }[]
  verdict: string
}

const inRange = (v: number, [a, b]: [number, number], tol = 0) => v >= a - tol && v <= b + tol

export function checkMusic(m: MusicResult, spec: MusicSpec): MusicCheck {
  const mv = musicVec(m)
  const emotion = Math.round(clamp(1 - dist(mv, spec.basis) / 1.4, 0, 1) * 100)
  const modeOk =
    m.mode === spec.mode || (spec.mode === '五声音阶' && (m.mode === '大调' || m.mode === '环境音')) || (spec.mode === '环境音' && m.mode !== '小调')
  const items = [
    { label: 'BPM', value: m.bpm ? `${m.bpm}` : '无明显节拍', expect: `${spec.bpm[0]}–${spec.bpm[1]}`, ok: m.bpm ? inRange(m.bpm, spec.bpm, 6) || inRange(m.bpm / 2, spec.bpm, 4) || inRange(m.bpm * 2, spec.bpm, 4) : spec.density === '低' },
    { label: '调式', value: `${m.key} ${m.mode}`, expect: spec.mode, ok: modeOk },
    { label: '节奏密度', value: `${m.density.toFixed(2)}/s`, expect: `${spec.densityRate[0]}–${spec.densityRate[1]}/s`, ok: inRange(m.density, spec.densityRate, 0.5) },
    { label: '和声紧张度', value: `${m.tension}`, expect: `${spec.tension[0]}–${spec.tension[1]}`, ok: inRange(m.tension, spec.tension, 10) },
    { label: '频谱重心', value: `${Math.round(m.centroid)} Hz`, expect: `${spec.centroid[0]}–${spec.centroid[1]} Hz`, ok: inRange(m.centroid, spec.centroid, 300) },
    { label: '自然声占比', value: `${m.natural}%`, expect: `${spec.natural[0]}–${spec.natural[1]}%`, ok: inRange(m.natural, spec.natural, 10) },
  ]
  const paramScore = (items.filter((i) => i.ok).length / items.length) * 100
  const score = Math.round(emotion * 0.6 + paramScore * 0.4)
  const verdict = score >= 75 ? '高度匹配，可直接使用' : score >= 55 ? '基本匹配，建议按未达标项微调' : '匹配度偏低，建议更换或重新编配'
  return { score, emotion, items, verdict }
}
