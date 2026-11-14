export type Band = 'warm' | 'neutral' | 'cool'

export interface Scene {
  id: string
  name: string
  pinyin: string
  elements: string
  /** 意境描述 — poetic scene narrative from the source deck */
  description: string
  /** 情绪语义 — the emotional meaning this light carries (newly defined) */
  emotion: {
    /** three-word emotional signature */
    keywords: string[]
    /** a one-line semantic definition of what the light "says" */
    semantic: string
  }
  /** 适用情绪场景 — where this mood-light belongs (newly defined) */
  scenarios: string[]
  metrics: {
    cct: number
    cri: number
    r9: number
    lux: number
    mr: number
    duv: number
    x: number
    y: number
  }
  playback: { fps: number; duration: string }
  /** 彩光实测（RGB 三色混色光源，动态场景积分测量）；index 为灯光素材编号 */
  colorLight?: ColorLightMetrics
  band: Band
  /** hero gradient evoking the scene palette */
  gradient: string
  accent: string
}

export interface ColorLightMetrics {
  index: number
  cct: number
  cri: number
  r9: number
  /** 光通量 lm */
  flux: number
  /** 功率 W */
  power: number
  /** 光效 lm/W */
  efficacy: number
  sdcm: number
  duv: number
  x: number
  y: number
}

export const scenes: Scene[] = [
  {
    id: 'sunrise',
    name: '旭日东升',
    pinyin: 'SUNRISE',
    elements: '初阳 · 云彩',
    description:
      '随着太阳的升起，新的一天开始了。捕捉到旭日初升的那一刹那，阳光洒满大地，万物苏醒的瞬间。这不仅是自然的新生，也是人们精神的焕发。',
    emotion: {
      keywords: ['希望', '唤醒', '新生'],
      semantic: '暖橙初阳唤起身体的清醒信号，传递向上、启程与充满可能的积极心境。',
    },
    scenarios: ['晨间唤醒', '开工启动会', '团队誓师', '季度启航', '正能量激励'],
    metrics: { cct: 3175, cri: 93.3, r9: 72.9, lux: 2040.1, mr: 0.5542, duv: 0.00923, x: 0.4376, y: 0.428 },
    playback: { fps: 25, duration: '00:01:00' },
    colorLight: { index: 1, cct: 3088, cri: 93.3, r9: 76, flux: 10895, power: 137.4, efficacy: 79.27, sdcm: 10.0, duv: 0.00667, x: 0.4404, y: 0.4224 },
    band: 'warm',
    gradient: 'linear-gradient(150deg, #7a2f00 0%, #ff7a18 42%, #ffb347 72%, #ffe0a3 100%)',
    accent: '#ff9d3d',
  },
  {
    id: 'autumn',
    name: '秋高气爽',
    pinyin: 'CRISP AUTUMN',
    elements: '秋色 · 枫叶',
    description:
      '枫叶在秋风的轻抚下，缓缓飘落，如同时间的沙漏，静静地诉说着季节的更迭。林间小径上，铺满了金黄色的落叶，与火红的枫叶交织成一幅绚烂的秋色画卷。',
    emotion: {
      keywords: ['沉稳', '丰盈', '从容'],
      semantic: '金黄暖调带来成熟与踏实的收获感，让情绪由躁动沉淀为从容与专注。',
    },
    scenarios: ['午后专注办公', '深度思考', '复盘总结', '成熟品牌洽谈', '静心阅读'],
    metrics: { cct: 3752, cri: 96.9, r9: 89.0, lux: 2133.5, mr: 0.7015, duv: 0.00262, x: 0.3943, y: 0.3908 },
    playback: { fps: 30, duration: '00:01:00' },
    colorLight: { index: 12, cct: 3596, cri: 96.2, r9: 92, flux: 10866, power: 146.4, efficacy: 74.22, sdcm: 7.1, duv: -0.00436, x: 0.3959, y: 0.3762 },
    band: 'warm',
    gradient: 'linear-gradient(150deg, #6b3b09 0%, #c46a1b 40%, #e8a13a 70%, #f7d99a 100%)',
    accent: '#e8a13a',
  },
  {
    id: 'dusk',
    name: '薄暮冥冥',
    pinyin: 'SOFT DUSK',
    elements: '夕阳暮色 · 云彩',
    description:
      '天空渐变成温柔的暖色调，紫蓝交织着余晖，橙金铺展在天际，仿佛画布上的柔和晕染。微风拂过，空气中弥漫着静谧与温暖，一切都被笼罩在这恬淡的暮色之中。',
    emotion: {
      keywords: ['温柔', '松弛', '治愈'],
      semantic: '紫橙暮色柔化环境张力，帮助情绪从紧张过渡到松弛，是一天的温柔收束。',
    },
    scenarios: ['下班过渡', '情感沟通', '轻松茶歇', '暖场社交', '心理疏导空间'],
    metrics: { cct: 3846, cri: 94.6, r9: 85.4, lux: 2650.1, mr: 0.779, duv: -0.0055, x: 0.3832, y: 0.3668 },
    playback: { fps: 30, duration: '00:01:00' },
    colorLight: { index: 7, cct: 5094, cri: 83.4, r9: 33, flux: 8829.6, power: 127.4, efficacy: 69.31, sdcm: 19.5, duv: -0.0162, x: 0.3402, y: 0.3175 },
    band: 'warm',
    gradient: 'linear-gradient(150deg, #3d2a63 0%, #8a5aa0 34%, #e07b54 68%, #f6bd6b 100%)',
    accent: '#e07b54',
  },
  {
    id: 'glow',
    name: '霞光万道',
    pinyin: 'RADIANT GLOW',
    elements: '暮色 · 云彩',
    description:
      '随着太阳逐渐升高，霞光在天边绽放，万道光芒交织成一幅美丽的画卷。我们希望通过画面展示这绚烂的色彩，激发观众的情感共鸣。',
    emotion: {
      keywords: ['激情', '绽放', '共鸣'],
      semantic: '炽烈霞光点燃情绪的高光时刻，营造充满感染力的绽放与共鸣氛围。',
    },
    scenarios: ['庆典高光', '颁奖时刻', '新品发布', '团队分享', '庆功宴'],
    metrics: { cct: 4109, cri: 96.0, r9: 90.5, lux: 1810.7, mr: 0.8078, duv: -0.0032, x: 0.3737, y: 0.3658 },
    playback: { fps: 30, duration: '00:01:00' },
    colorLight: { index: 6, cct: 3667, cri: 93.6, r9: 80, flux: 8086.8, power: 112.9, efficacy: 71.6, sdcm: 11.6, duv: -0.00825, x: 0.389, y: 0.3644 },
    band: 'neutral',
    gradient: 'linear-gradient(150deg, #24305c 0%, #b74a2c 45%, #e0602f 70%, #f4a340 100%)',
    accent: '#e0602f',
  },
  {
    id: 'spring',
    name: '春和景明',
    pinyin: 'BRIGHT SPRING',
    elements: '青绿 · 光影',
    description:
      '抬头间，只见青绿光影在树梢与叶片间交错缠绵。微风轻拂，带来丝丝缕缕的清新，阳光斑驳，洒满一地温暖的碎片。光影交错间，时间仿佛静止，让人沉醉在这宁静而美好的画面。',
    emotion: {
      keywords: ['清新', '生机', '愉悦'],
      semantic: '青绿光影释放自然生长的活力，激发轻快、开放而愉悦的创造性情绪。',
    },
    scenarios: ['头脑风暴', '创意工作坊', '春季营销', '亲子活动', '轻办公休闲区'],
    metrics: { cct: 5501, cri: 90.4, r9: 57.6, lux: 2642.7, mr: 0.9331, duv: 0.01052, x: 0.3326, y: 0.3625 },
    playback: { fps: 30, duration: '00:02:00' },
    colorLight: { index: 10, cct: 4962, cri: 85.6, r9: 40, flux: 14095, power: 153.8, efficacy: 91.65, sdcm: 11.6, duv: 0.0136, x: 0.3491, y: 0.3834 },
    band: 'neutral',
    gradient: 'linear-gradient(150deg, #3f6b2c 0%, #8fd14f 42%, #c7e9a0 74%, #eef7d6 100%)',
    accent: '#8fd14f',
  },
  {
    id: 'hearts',
    name: '心心相印',
    pinyin: 'TWO HEARTS',
    elements: '浪漫粉 · 爱心',
    description:
      '粉色的光晕弥漫，柔和而温暖，心形的光影交错浮现，仿佛两颗心灵相互呼应，默契相连。爱意在空气中流转，不需言语，便能感受那份温柔与甜蜜。此刻，世界仿佛只剩下彼此，心心相印，温暖长存。',
    emotion: {
      keywords: ['浪漫', '亲密', '甜蜜'],
      semantic: '柔粉光晕软化人与人的距离，唤起亲密、温柔与被爱包裹的甜蜜心境。',
    },
    scenarios: ['求婚表白', '情侣纪念', '婚庆布置', '情人节主题', '温馨私宴'],
    metrics: { cct: 6151, cri: 92.2, r9: 69.0, lux: 4204.8, mr: 1.098, duv: -0.0042, x: 0.32, y: 0.32 },
    playback: { fps: 25, duration: '00:00:30' },
    band: 'neutral',
    gradient: 'linear-gradient(150deg, #a83a70 0%, #ff6fa5 42%, #ffa8c8 72%, #ffe4ee 100%)',
    accent: '#ff6fa5',
  },
  {
    id: 'bamboo',
    name: '翠竹婆娑',
    pinyin: 'SWAYING BAMBOO',
    elements: '竹林 · 落叶',
    description:
      '翠竹在风中轻轻摇曳，姿态婆娑，宛如一群身着绿裙的舞者，在微风中翩翩起舞。那竹叶缓缓飘落，如同时间的细沙滑落，带着一丝凉意与宁静，营造出一种静谧而深远的意境。',
    emotion: {
      keywords: ['静谧', '清雅', '禅意'],
      semantic: '疏影翠竹带来清凉与留白，安抚焦躁情绪，导向清雅、内省的东方禅境。',
    },
    scenarios: ['茶室会客', '冥想瑜伽', '东方美学空间', '静音专注', '高端接待'],
    metrics: { cct: 6161, cri: 95.6, r9: 94.8, lux: 4062.3, mr: 1.024, duv: 0.00142, x: 0.3189, y: 0.331 },
    playback: { fps: 30, duration: '00:01:00' },
    band: 'neutral',
    gradient: 'linear-gradient(150deg, #375c38 0%, #6fa86a 40%, #b9d9a5 72%, #eef4e4 100%)',
    accent: '#6fa86a',
  },
  {
    id: 'diffuse',
    name: '多彩弥散',
    pinyin: 'SOFT DIFFUSION',
    elements: '淡彩混色 · 光斑',
    description:
      '画面色彩柔和梦幻，多色交融弥散，宛如晨雾轻纱，空灵飘渺。光影流转，营造宁静悠远的意境，给人以纯净和神秘的遐想。',
    emotion: {
      keywords: ['空灵', '纯净', '遐想'],
      semantic: '淡彩弥散消解具象边界，让思绪放空漂浮，进入纯净、自由的遐想状态。',
    },
    scenarios: ['艺术展陈', '休憩放空', '灵感孵化', '幻想主题空间', '放松过渡区'],
    metrics: { cct: 6168, cri: 95.7, r9: 96.5, lux: 4337.9, mr: 1.063, duv: 0.0026, x: 0.3186, y: 0.3335 },
    playback: { fps: 30, duration: '00:01:00' },
    band: 'neutral',
    gradient: 'linear-gradient(150deg, #6a4fa0 0%, #b39ddb 38%, #a8d5e2 70%, #d6ecd9 100%)',
    accent: '#b39ddb',
  },
  {
    id: 'ink',
    name: '山水墨韵',
    pinyin: 'INK RHYTHM',
    elements: '水墨 · 律动',
    description:
      '宛若细腻柔滑的绸缎，轻轻随着音乐的旋律起舞律动。那墨色或浓或淡，如同音符的高低起伏，交织出一幅动人心魄的画卷。在墨的流淌中，仿佛能听见大自然的低语。',
    emotion: {
      keywords: ['内敛', '律动', '东方意境'],
      semantic: '浓淡水墨在明暗间律动，传递含蓄、克制而富有节奏的东方审美情绪。',
    },
    scenarios: ['文化展厅', '书画空间', '品牌调性展示', '慢节奏沉浸', '雅集活动'],
    metrics: { cct: 6248, cri: 94.7, r9: 84.7, lux: 3742.5, mr: 1.086, duv: -0.0006, x: 0.3178, y: 0.3266 },
    playback: { fps: 30, duration: '00:02:20' },
    band: 'cool',
    gradient: 'linear-gradient(150deg, #101012 0%, #4a4a4d 40%, #9a9a9d 72%, #ededed 100%)',
    accent: '#c9c9cc',
  },
  {
    id: 'flowers',
    name: '繁花似锦',
    pinyin: 'BLOOMING FLOWERS',
    elements: '梦幻光影 · 花盛开',
    description:
      '绽放于春日的暖阳下，像是大自然精心雕琢的艺术品，色彩斑斓，绚丽夺目。在微风中轻轻摇曳，背光之处，斑驳陆离的光影洒落，为这繁花盛景添上一抹神秘而温柔的色彩。',
    emotion: {
      keywords: ['绚烂', '喜悦', '丰盛'],
      semantic: '斑斓花影铺陈盛放的喜悦，营造热烈、丰盛而充满仪式感的欢庆情绪。',
    },
    scenarios: ['节庆氛围', '婚礼花艺', '女性主题活动', '春日焕新', '欢庆聚会'],
    metrics: { cct: 6828, cri: 91.6, r9: 65.2, lux: 3638.1, mr: 1.166, duv: -0.0038, x: 0.3098, y: 0.31 },
    playback: { fps: 25, duration: '00:01:00' },
    band: 'cool',
    gradient: 'linear-gradient(150deg, #5a3b9c 0%, #ec407a 42%, #26c6da 78%, #d6f2f6 100%)',
    accent: '#ec407a',
  },
  {
    id: 'starlight',
    name: '星光璀璨',
    pinyin: 'STARLIGHT',
    elements: '繁星 · 星云',
    description:
      '一片片星云如同梦幻般的画卷，缓缓展开在宇宙的舞台上。星光与星云交相辉映，共同编织出一幅幅令人叹为观止的宇宙奇观，让人不禁沉醉于这浩瀚而神秘的星空之下。',
    emotion: {
      keywords: ['梦幻', '浩瀚', '敬畏'],
      semantic: '深邃星云唤起对浩瀚的敬畏与好奇，带来沉浸、遐想而略带神秘的心境。',
    },
    scenarios: ['沉浸式观影', '星空主题', '夜间氛围', '科技幻想展', '睡前场景'],
    metrics: { cct: 7800, cri: 80.5, r9: 5.7, lux: 1764.1, mr: 0.9212, duv: -0.01401, x: 0.303, y: 0.2878 },
    playback: { fps: 25, duration: '00:02:00' },
    colorLight: { index: 9, cct: 9344, cri: 69.7, r9: -44, flux: 4316.1, power: 68.04, efficacy: 63.44, sdcm: 37.5, duv: -0.0207, x: 0.2957, y: 0.2688 },
    band: 'cool',
    gradient: 'linear-gradient(150deg, #150e2e 0%, #4a2f7d 40%, #9c5fc0 74%, #d7a8e6 100%)',
    accent: '#9c5fc0',
  },
  {
    id: 'meditation',
    name: '静思冥想',
    pinyin: 'MEDITATION',
    elements: '神秘紫 · 曼陀罗',
    description:
      '心灵仿佛步入了一片宁静的宇宙，曼陀罗的变化在脑海中悄然上演。那是一种深邃而微妙的沉思状态，每个念头都如同曼陀罗的每一瓣，缓缓展开，又悄然融合，展现出无尽的变幻与和谐。',
    emotion: {
      keywords: ['深邃', '安定', '内省'],
      semantic: '神秘紫调降低感官刺激、引导呼吸放缓，帮助情绪进入安定、内省的冥想态。',
    },
    scenarios: ['冥想空间', '心理疗愈', '深度睡眠引导', '瑜伽静修', '独处沉淀'],
    metrics: { cct: 8391, cri: 86.0, r9: 30.3, lux: 2945.3, mr: 0.9087, duv: -0.0085, x: 0.2957, y: 0.2899 },
    playback: { fps: 25, duration: '00:02:43' },
    band: 'cool',
    gradient: 'linear-gradient(150deg, #2a1a44 0%, #5a3a8c 42%, #9c6ade 74%, #d8bef0 100%)',
    accent: '#9c6ade',
  },
  {
    id: 'thunder',
    name: '雷霆万钧',
    pinyin: 'THUNDERSTORM',
    elements: '阴云 · 闪电',
    description:
      '雷霆万钧之势，震撼天地，那轰鸣的雷声，仿佛自九天之外滚滚而来，带着无尽的力量与威严。紧接着，细雨如丝，逐渐转为倾盆大雨，雨声渐沥，与雷声交织成一首激昂的自然交响乐。',
    emotion: {
      keywords: ['力量', '震撼', '警醒'],
      semantic: '骤明骤暗的冷冽光效制造强烈张力，激发肾上腺素，带来力量、警醒与震撼。',
    },
    scenarios: ['电竞对战', '动感场景', '戏剧张力时刻', '能量爆发展示', '悬疑氛围'],
    metrics: { cct: 8369, cri: 93.1, r9: 81.9, lux: 1528.1, mr: 1.267, duv: 0.00093, x: 0.2914, y: 0.3024 },
    playback: { fps: 30, duration: '00:01:00' },
    colorLight: { index: 4, cct: 42340, cri: 83.9, r9: 91, flux: 2002.2, power: 32, efficacy: 62.57, sdcm: 53.8, duv: 0.007, x: 0.2407, y: 0.249 },
    band: 'cool',
    gradient: 'linear-gradient(150deg, #060d20 0%, #1c3358 44%, #4a6a9c 74%, #cfe0f5 100%)',
    accent: '#6f92c8',
  },
  {
    id: 'clearsky',
    name: '晴空万里',
    pinyin: 'CLEAR SKY',
    elements: '光晕 · 云',
    description:
      '从开阔的天空开始，镜头缓缓展现万里晴空，明亮而深邃。云卷云舒，风轻拂面，自由飞翔，心随天高。仰望天空，思绪万千，晴空之下，万物生长。',
    emotion: {
      keywords: ['开阔', '自由', '明朗'],
      semantic: '高色温晴空提升警觉与专注，带来开阔、清醒而积极向上的明朗情绪。',
    },
    scenarios: ['高效办公', '专注学习', '清晨提神', '开放协作区', '健康作息照明'],
    metrics: { cct: 9430, cri: 91.5, r9: 71.6, lux: 2277.7, mr: 1.354, duv: -0.0003, x: 0.2842, y: 0.2919 },
    playback: { fps: 25, duration: '00:01:00' },
    colorLight: { index: 3, cct: 13188, cri: 86.4, r9: 69, flux: 13560, power: 177.1, efficacy: 76.56, sdcm: 35.8, duv: 0.00108, x: 0.2673, y: 0.274 },
    band: 'cool',
    gradient: 'linear-gradient(150deg, #0f4f9e 0%, #1e6fd0 40%, #6bb0f0 72%, #dceeff 100%)',
    accent: '#4a95e8',
  },
  {
    id: 'aurora',
    name: '北欧极光',
    pinyin: 'NORTHERN LIGHTS',
    elements: '极光',
    description:
      '极光在夜空中流淌，紫绿交织，宛如梦幻画卷。神秘光影变幻，似银河倾泻，静谧而震撼，给人无尽遐想。',
    emotion: {
      keywords: ['神秘', '治愈', '遐思'],
      semantic: '紫绿极光在暗色天幕中缓缓流动，抚平情绪、唤起治愈与无边的浪漫遐思。',
    },
    scenarios: ['情绪疗愈', '夜间放松', '浪漫约会', '艺术沉浸', '助眠氛围过渡'],
    metrics: { cct: 9715, cri: 90.5, r9: 67.7, lux: 434.6, mr: 1.298, duv: 0.0099, x: 0.2763, y: 0.3025 },
    playback: { fps: 25, duration: '00:00:10' },
    colorLight: { index: 8, cct: 8228, cri: 88, r9: 56, flux: 1845.7, power: 26.75, efficacy: 69, sdcm: 17.9, duv: 0.0106, x: 0.2879, y: 0.3174 },
    band: 'cool',
    gradient: 'linear-gradient(150deg, #07211f 0%, #12a06b 40%, #6f7fd6 70%, #a45ee5 100%)',
    accent: '#17b978',
  },
  {
    id: 'breeze',
    name: '云淡风轻',
    pinyin: 'GENTLE BREEZE',
    elements: '薄云 · 微风',
    description:
      '天空湛蓝，几缕薄云悠悠飘过，随着轻柔的微风缓缓舒展、变幻。没有骄阳的炙烤，也没有阴云的压迫，只有恰到好处的明亮与松弛，一切都显得那样从容而闲适。',
    emotion: {
      keywords: ['淡然', '从容', '闲适'],
      semantic: '柔亮天光与游云带来无压迫的松弛感，让情绪回归淡然、从容与自在的日常闲适。',
    },
    scenarios: ['午后小憩', '慢生活空间', '静心办公', '下午茶会客', '独处放松'],
    metrics: { cct: 5200, cri: 94.2, r9: 82.0, lux: 2560.0, mr: 0.905, duv: 0.0021, x: 0.3378, y: 0.3541 },
    playback: { fps: 25, duration: '00:01:30' },
    colorLight: { index: 2, cct: 8680, cri: 90, r9: 79, flux: 17114, power: 215.8, efficacy: 79.33, sdcm: 20.4, duv: 0.000375, x: 0.2891, y: 0.2988 },
    band: 'neutral',
    gradient: 'linear-gradient(150deg, #3f6aa0 0%, #7ea9d8 40%, #bcd6ef 72%, #eef5fb 100%)',
    accent: '#7ea9d8',
  },
  {
    id: 'wintersnow',
    name: '冬凌雪月',
    pinyin: 'WINTER SNOW MOON',
    elements: '冰凌 · 雪月',
    description:
      '寒夜里，月色如水倾泻在皑皑白雪之上，冰凌折射出清冷的微光。万籁俱寂，天地间只余一片澄澈的银白，纯净得不染纤尘，凛冽中透着一种孤高而圣洁的美。',
    emotion: {
      keywords: ['清冷', '纯净', '孤高'],
      semantic: '冷白雪光与月色压低感官温度，营造澄澈、克制而略带孤高的纯净心境。',
    },
    scenarios: ['冬季主题空间', '极简展陈', '静谧夜读', '高端珠宝陈列', '冥想静修'],
    metrics: { cct: 6800, cri: 92.8, r9: 78.3, lux: 1980.0, mr: 1.152, duv: -0.0018, x: 0.3105, y: 0.3182 },
    playback: { fps: 25, duration: '00:01:20' },
    band: 'cool',
    gradient: 'linear-gradient(150deg, #24384f 0%, #6f8db0 40%, #c3d6e8 72%, #f4f8fc 100%)',
    accent: '#a9c4de',
  },
  {
    id: 'summerwave',
    name: '夏日清波',
    pinyin: 'SUMMER RIPPLES',
    elements: '碧波 · 涟漪',
    description:
      '盛夏午后，一泓碧水漾开层层涟漪，阳光在水面跳跃闪烁，折射出粼粼的青碧光影。清凉的水色驱散了暑气，波光荡漾之间，只觉一身畅快与舒展。',
    emotion: {
      keywords: ['清凉', '畅快', '舒展'],
      semantic: '青碧波光传递水的清凉与流动感，消解燥热、释放压力，唤起畅快而舒展的情绪。',
    },
    scenarios: ['夏季营销', '水主题空间', '运动健身区', '清爽办公', '消暑休憩'],
    metrics: { cct: 7050, cri: 93.5, r9: 80.6, lux: 3120.0, mr: 1.078, duv: 0.0035, x: 0.3021, y: 0.3208 },
    playback: { fps: 30, duration: '00:01:40' },
    colorLight: { index: 11, cct: 14306, cri: 84, r9: 43, flux: 11628, power: 151.4, efficacy: 76.78, sdcm: 41.1, duv: 0.0131, x: 0.2552, y: 0.282 },
    band: 'cool',
    gradient: 'linear-gradient(150deg, #0a5c66 0%, #1ba3ad 40%, #7fd6d0 72%, #d9f4ef 100%)',
    accent: '#1ba3ad',
  },
  {
    id: 'afterrain',
    name: '雨后晴天',
    pinyin: 'CLEAR AFTER RAIN',
    elements: '初霁 · 新绿',
    description:
      '一场夏雨过后，云层裂开缝隙，第一缕阳光洒落人间。空气被雨水洗得格外清新，草木新绿透亮，天边隐约挂起一抹淡淡的虹彩，万物都像被重新擦亮了一般。',
    emotion: {
      keywords: ['舒朗', '清新', '释然'],
      semantic: '雨霁初晴的通透光感带来豁然开朗的释然，把郁结的情绪转化为清新与希望。',
    },
    scenarios: ['情绪疗愈', '雨后过渡', '清新办公', '正念空间', '焕新启动'],
    metrics: { cct: 5800, cri: 95.1, r9: 86.4, lux: 2740.0, mr: 0.948, duv: 0.0009, x: 0.3268, y: 0.3402 },
    playback: { fps: 30, duration: '00:01:00' },
    colorLight: { index: 5, cct: 20091, cri: 85.8, r9: 88, flux: 9537.2, power: 123.4, efficacy: 77.27, sdcm: 46.2, duv: 0.00788, x: 0.25, y: 0.2641 },
    band: 'neutral',
    gradient: 'linear-gradient(150deg, #2d6a86 0%, #56b0a0 40%, #a9dca0 72%, #eaf6e2 100%)',
    accent: '#56b0a0',
  },
]

export const bandLabels: Record<Band | 'all', string> = {
  all: '全部',
  warm: '暖调 · 唤醒',
  neutral: '中性 · 平衡',
  cool: '冷调 · 沉静',
}
