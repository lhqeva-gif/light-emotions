// 《动态光效设计提案 · 2025/12/15》23 个意境素材
// 原提案含：名称 · 意境描述 · 元素标签 · 色彩板
// 本页新增分析：情绪语义（emotion）+ 适用情绪场景（scenarios）+ 情绪基调（band）

import type { Band } from './scenes'

export interface ProposalScene {
  id: string
  index: number
  batch: 1 | 2
  band: Band
  name: string
  elements: string[]
  description: string
  palette: string[]
  emotion: { keywords: string[]; semantic: string }
  scenarios: string[]
}

// 情绪基调分类：暖调·唤醒 / 中性·平衡 / 冷调·沉静
const bandById: Record<string, Band> = {
  'city-sunset': 'warm',
  'sunset-mountain': 'warm',
  'quiet-moon': 'cool',
  'morning-sun': 'neutral',
  'ink-flow': 'cool',
  'starry-dots': 'cool',
  'floating-ice': 'cool',
  willow: 'neutral',
  'sunset-coast': 'warm',
  'iceland-town': 'cool',
  rainforest: 'neutral',
  'joyful-time': 'warm',
  'gilded-moment': 'warm',
  'sky-picnic': 'neutral',
  'golden-red': 'warm',
  'a-drink': 'warm',
  'baby-dream': 'warm',
  'sky-lantern': 'cool',
  'flowing-fire': 'cool',
  'golden-wheat': 'neutral',
  'maple-temple': 'warm',
  'hearth-fire': 'warm',
  'city-neon': 'cool',
}

const rawProposalScenes: Omit<ProposalScene, 'band'>[] = [
  {
    id: 'city-sunset',
    index: 1,
    batch: 1,
    name: '都市落日',
    elements: ['高楼街道剪影', '晚霞天色'],
    description:
      '暮色四合，天边浸染着淡紫与金黄的温柔光影，为蜿蜒归家路披上朦胧光晕。远方窗扉在渐浓的暮色中如琥珀灯塔闪烁，温暖与共聚的承诺牵引着倦客前行。——那里有共享的故事与灯火，在静谧暮色中静静等候。',
    palette: ['#6b5c9e', '#f2899f', '#f5c563'],
    emotion: { keywords: ['归属', '温暖', '卸下'], semantic: '暮色琥珀光晕软化都市棱角，唤起归家的温暖与卸下白日负累的松弛。' },
    scenarios: ['晚归氛围', '居家过渡', '都市夜景餐厅', '暖场社交', '情绪减压'],
  },
  {
    id: 'sunset-mountain',
    index: 2,
    batch: 1,
    name: '日落山间',
    elements: ['落日余晖', '流动的云彩'],
    description:
      '落日点燃天际，云彩如鎏金的江河在赤焰中奔涌，边缘跃动着转瞬即逝的火光。这场天空之舞将苍穹化为流动画卷，每道光影都在诉说白日温柔的告别。在这宁谧奇观中，时间仿佛放缓脚步，任灵魂在流淌的瑰色间徜徉。',
    palette: ['#5a6a9e', '#e06334', '#f5c842'],
    emotion: { keywords: ['壮阔', '告别', '沉醉'], semantic: '熔金落日铺展壮阔余晖，唤起对时光温柔告别的沉醉与感怀。' },
    scenarios: ['观景休憩', '黄昏冥想', '露台酒会', '旅拍场景', '情感沉淀'],
  },
  {
    id: 'quiet-moon',
    index: 3,
    batch: 1,
    name: '静谧月光',
    elements: ['圆月', '黑云'],
    description:
      '月轮无声流转，拨开夜的帷幕，显露出墨色天鹅绒间静谧的圆满光轮。清辉之下，独栋小屋的窗扉如琥珀泪滴，暖光漫过凝霜的草甸。——夜的神秘与人间的慰藉完美共舞，为安眠的大地织就一幅星光与梦境绣成的画卷。',
    palette: ['#3b4a7c', '#eef0f5', '#1a2440'],
    emotion: { keywords: ['静谧', '安眠', '治愈'], semantic: '清冷月华拨开夜幕，带来静谧、安眠而被慰藉的深夜治愈感。' },
    scenarios: ['睡前助眠', '夜读', '静音卧室', '冥想放松', '疗愈空间'],
  },
  {
    id: 'morning-sun',
    index: 4,
    batch: 1,
    name: '清晨朝阳',
    elements: ['日出', '朝云'],
    description:
      '破晓时分，淡蓝色的天幕轻拥着几缕染上浅金的云丝。朝阳如一簇柔和的琥珀色光焰，带着崭新开始的承诺缓缓升起，光芒如流淌的希望，漫过挂满晨露的世界。——如同一曲宁静的更新交响乐，以清新蓬勃的能量，轻轻唤醒沉睡的灵魂。',
    palette: ['#a8d0f0', '#f5e0b8'],
    emotion: { keywords: ['希望', '唤醒', '蓬勃'], semantic: '淡蓝天幕与琥珀朝阳传递崭新开始的希望，轻柔唤醒沉睡的活力。' },
    scenarios: ['晨间唤醒', '健康作息', '启动会', '瑜伽晨练', '正能量场景'],
  },
  {
    id: 'ink-flow',
    index: 5,
    batch: 1,
    name: '墨影流光',
    elements: ['圆环无限交替', '神秘紫'],
    description:
      '在这宁静的圣所，发光的圆环以缓慢交替的节奏脉动——一场无声的舞蹈，将心神引入更深沉的凝思。它们柔和的光芒编织出无限的奥秘，思绪在其中舒展、重组，汇入永续平和的流动。在这神圣的几何之中，时间消融为纯粹的觉知。',
    palette: ['#a04fe0', '#6aa88f', '#d8c090'],
    emotion: { keywords: ['深邃', '凝思', '觉知'], semantic: '缓慢脉动的发光圆环引导心神下沉，进入深邃、纯粹的凝思觉知。' },
    scenarios: ['冥想空间', '正念疗愈', '艺术装置', '沉浸展陈', '独处沉淀'],
  },
  {
    id: 'starry-dots',
    index: 6,
    batch: 1,
    name: '点点星光',
    elements: ['星尘', '星光'],
    description:
      '在星云的中心，星光在青色与紫红色星尘间轻盈流转，如宇宙温柔的呼吸。星子如碎钻闪烁，柔和的脉动编织着太空摇篮曲。这方永恒流转的星辉织锦，将灵魂包裹于静谧的奇迹之中，每一缕微光都在诉说着古老而抚慰人心的温暖。',
    palette: ['#1a8a8a', '#a86a3a', '#a86ac0'],
    emotion: { keywords: ['梦幻', '抚慰', '温柔'], semantic: '碎钻般星辉在星尘间轻盈流转，编织宇宙摇篮曲般的梦幻与抚慰。' },
    scenarios: ['睡前场景', '星空主题', '儿童房', '浪漫夜晚', '沉浸观影'],
  },
  {
    id: 'floating-ice',
    index: 7,
    batch: 1,
    name: '仲夏浮冰',
    elements: ['冰块', '气泡'],
    description:
      '夏日骄阳下，淡蓝的冰块在凝霜的玻璃杯中轻响，水晶般的棱角化作沁凉水珠。气泡如液态星座盘旋上升，在杯沿碎成清朗笑声。这被青蓝与霜白包裹的瞬间，封存着清凉的本源——一次轻柔而雀跃的逃离，夏日燥热终向冰与光交织的脆爽诗意臣服。',
    palette: ['#2a9de0', '#6ad8d0'],
    emotion: { keywords: ['清凉', '雀跃', '畅快'], semantic: '青蓝霜白的冰感光色封存清凉本源，带来轻盈雀跃的畅快逃离。' },
    scenarios: ['夏季消暑', '饮品空间', '运动健身', '清爽办公', '冷饮吧台'],
  },
  {
    id: 'willow',
    index: 8,
    batch: 1,
    name: '杨柳依依',
    elements: ['蓝天白云', '柳枝'],
    description:
      '碧空如洗，云絮如白日梦徜徉无垠画布，柳枝在暖风中勾勒柔美弧线，翠叶与清风低语呢喃。蔚蓝与纯白交织，静谧与灵动交融，此刻凝成自然最宁静的诗篇——时光在此停驻，心灵在无垠苍穹下寻得安宁的港湾。',
    palette: ['#2a8de0', '#4a9e4a'],
    emotion: { keywords: ['宁静', '灵动', '安宁'], semantic: '蔚蓝与翠绿交织出柔美弧线，让心灵在宁静与灵动间寻得安宁的港湾。' },
    scenarios: ['春日休闲', '庭院会客', '慢生活空间', '放松过渡', '亲自然场景'],
  },
  {
    id: 'sunset-coast',
    index: 9,
    batch: 1,
    name: '夕阳海岸',
    elements: ['落日晚霞', '海浪沙滩'],
    description:
      '落日熔金，将天空染成橘红与玫瑰色的绚烂。轻柔海浪抚过沙滩，规律的潮声与湿润沙粒上的脚步声交织成曲。在这宁静时刻，世界仿佛暂停——温暖金光笼罩万物，将灵魂包裹在温柔绵长的静谧与永恒之美中。',
    palette: ['#4a95e8', '#f0a35a', '#7ab0f0'],
    emotion: { keywords: ['绵长', '温柔', '永恒'], semantic: '熔金落日笼罩海岸，将情绪包裹在温柔绵长、仿佛永恒的静谧里。' },
    scenarios: ['度假氛围', '海景空间', '情侣约会', '黄昏休憩', '情感沉浸'],
  },
  {
    id: 'iceland-town',
    index: 10,
    batch: 1,
    name: '冰岛小镇',
    elements: ['极光', '山峰'],
    description:
      '在极光翩跹的天幕下，极光牧场静卧于雪覆的山谷间。一座红屋沐浴在幻妙光辉中，窗扉透出的暖意与天际奇景交相辉映。嶙峋峰峦在摇曳的翠色光带前剪出巍峨轮廓，宛如守护着这片秘境——在此，人间烟火与天际奇迹达成永恒的和谐。',
    palette: ['#2ae04a', '#f28ed8', '#2a9e6a'],
    emotion: { keywords: ['奇幻', '守护', '和谐'], semantic: '翩跹极光与温暖窗火交映，营造奇幻、被守护而人天和谐的秘境感。' },
    scenarios: ['夜间氛围', '极光主题', '艺术沉浸', '浪漫场景', '疗愈放松'],
  },
  {
    id: 'rainforest',
    index: 11,
    batch: 1,
    name: '雨林雾漫',
    elements: ['雾蕴森林', '雨丝'],
    description:
      '步入晨雾缭绕的林间，雨丝轻叩叶片的细响与脚步碾过湿泥的沙沙声交织成曲。越往深处，光线愈发朦胧，橡树与松柏在氤氲水汽中若隐若现，仿佛守护着被苔藓温柔覆盖的古老秘密。在这与世隔绝的宁静中，时光在此刻缓缓沉淀。',
    palette: ['#4a7a5a', '#8aa89a'],
    emotion: { keywords: ['幽谧', '沉淀', '隔绝'], semantic: '氤氲雾气与雨丝笼罩密林，营造与世隔绝、令时光缓缓沉淀的幽谧。' },
    scenarios: ['静心冥想', '森系空间', 'SPA 疗愈', '深度放松', '专注沉浸'],
  },
  {
    id: 'joyful-time',
    index: 12,
    batch: 1,
    name: '欢乐时光',
    elements: ['淡黄', '圆球'],
    description:
      '午后时光在茶香中舒展，琉璃杯中淡金色气泡轻盈碰撞，如阳光与蜜糖的细语呢喃。玛德琳蛋糕泛着温润光泽，与白瓷茶具交织成温暖画面。气泡在唇间悄然绽放，释放出佛手柑的幽香，时光在此刻沉淀为恬静的涟漪。',
    palette: ['#f5e08a', '#f5d59a'],
    emotion: { keywords: ['恬静', '愉悦', '涟漪'], semantic: '淡金气泡在茶香中轻盈碰撞，把愉悦沉淀为恬静而温暖的午后涟漪。' },
    scenarios: ['下午茶', '休闲社交', '咖啡厅', '轻松会客', '慢时光空间'],
  },
  {
    id: 'gilded-moment',
    index: 13,
    batch: 2,
    name: '鎏金时刻',
    elements: ['金黄光', '曲线'],
    description:
      '夜色如墨，将喧嚣隐去，唯留这抹温婉的金黄在烛光下翩然起舞。它蜿蜒向上的姿态，宛若餐桌上的梦境，光影流转间，勾勒出极致的食之美学。每一道曲线都藏着巧思，每一处光泽都在低语。于此静谧时刻，且将这份流动的餐韵，佐以时光，细细珍藏。',
    palette: ['#6b3b1a', '#f5dcb0', '#f5c268'],
    emotion: { keywords: ['精致', '奢享', '珍藏'], semantic: '温婉金黄在烛光下翩然流转，勾勒极致食光美学的精致与奢享。' },
    scenarios: ['高端餐饮', '品鉴宴席', '奢华场景', '烛光晚宴', '精致零售'],
  },
  {
    id: 'sky-picnic',
    index: 14,
    batch: 2,
    name: '蓝天野餐',
    elements: ['蓝天白云', '野餐'],
    description:
      '头顶是万里无云的湛蓝，阳光温暖而慷慨地洒满大地。风吹过，嫩绿的草地泛起温柔的波浪，枝叶间筛下的斑驳光影在红白格餐布上跳跃嬉戏。空气中弥漫着泥土和草木的清香，一切都柔软而宁静。在这片自然的怀抱中，食物与欢笑被光芒温柔拥抱。',
    palette: ['#4a95e8', '#4a9e4a', '#f2899f'],
    emotion: { keywords: ['惬意', '松弛', '美好'], semantic: '湛蓝晴空与嫩绿草浪把食物与欢笑温柔拥抱，带来远离尘嚣的惬意。' },
    scenarios: ['户外主题', '亲子活动', '休闲餐区', '春游氛围', '轻松聚会'],
  },
  {
    id: 'golden-red',
    index: 15,
    batch: 2,
    name: '金红流转',
    elements: ['红飘带', '团圆喜庆'],
    description:
      '当喜庆的红色飘带轻柔舞动，它便将阖家团圆的温馨场景环绕。桌上摆满了寓意吉祥的华夏佳肴，热气腾腾，香气四溢。亲人们围坐一堂，笑语声声，举箸间传递着深深的祝福与爱意。这不仅仅是美食的飨宴，更是红色丝带所牵系的、最珍贵的情感纽带。',
    palette: ['#f5dcb0', '#e0402a'],
    emotion: { keywords: ['喜庆', '团圆', '祝福'], semantic: '喜庆红飘带轻柔舞动，环绕阖家团圆的温馨，承载代代相传的祝福。' },
    scenarios: ['节庆布置', '团圆宴', '婚庆喜宴', '中式庆典', '家宴氛围'],
  },
  {
    id: 'a-drink',
    index: 16,
    batch: 2,
    name: '小酌一杯',
    elements: ['红微光', '轻柔舒缓'],
    description:
      '夜色低垂，清吧里流淌着慵懒而轻柔的爵士乐。微弱的光线如同琥珀般沉静，将一切棱角都温柔地磨平。调酒师手中的冰块碰撞出清脆的节拍，而杯中的液体反射出迷离的光晕。空气中弥漫着威士忌的麦芽香和淡淡的柑橘芬芳，心绪变得柔软，适合与知己轻声对饮。',
    palette: ['#f0f0f0', '#e0522a', '#e07a3a'],
    emotion: { keywords: ['慵懒', '柔软', '微醺'], semantic: '琥珀般微弱光线磨平棱角，让心绪变得柔软，适合知己微醺对饮。' },
    scenarios: ['酒吧氛围', '深夜小酌', '爵士现场', '私密会客', '放松社交'],
  },
  {
    id: 'baby-dream',
    index: 17,
    batch: 2,
    name: '宝宝梦幻',
    elements: ['奶黄色的气泡', '母爱'],
    description:
      '阳光亲吻着窗台，空气中弥漫着暖粉色的、带着奶香的甜意。当轻柔的指尖轻点，晶莹的泡泡便活泼地升腾而起。小婴儿瞪大好奇的双眼，伸出藕节般的小手去触碰那转瞬即逝的梦幻。这些灵动的泡泡，纯粹而美好，定格成母子间最温暖、最充满生命力的爱。',
    palette: ['#f2a488', '#f5e0c0'],
    emotion: { keywords: ['纯真', '温暖', '母爱'], semantic: '暖粉奶香的晶莹泡泡活泼升腾，定格母子间最温暖而充满生命力的爱。' },
    scenarios: ['母婴空间', '儿童房', '亲子时刻', '温馨家居', '育儿场景'],
  },
  {
    id: 'sky-lantern',
    index: 18,
    batch: 2,
    name: '孔明灯下',
    elements: ['蓝调夜晚', '孔明灯'],
    description:
      '夜色如醇厚的蓝丝绒，将喧嚣温柔笼罩。在城市微弱的蓝调光晕中，一枚枚孔明灯带着沉静的暖光，缓缓升入静谧的夜空。它们摇曳着希望的微光，与遥远的星辰温柔对话。此刻，你枕着这份宁静与温暖，让心绪随着孔明灯一同飘远，沉入一场甜美、安稳的梦境。',
    palette: ['#3a3aa0', '#c0202a', '#f0902a'],
    emotion: { keywords: ['希望', '安稳', '甜梦'], semantic: '醇厚蓝丝绒夜色中孔明灯升起暖光，让心绪随之飘远沉入安稳甜梦。' },
    scenarios: ['许愿场景', '节日夜晚', '浪漫氛围', '睡前放松', '祈福主题'],
  },
  {
    id: 'flowing-fire',
    index: 19,
    batch: 2,
    name: '流光若火',
    elements: ['流光溢彩', '炽烈'],
    description:
      '暗夜中，一团流光溢彩的火焰正以紫色和蓝色为主调，炽烈升腾。它不是寻常的赤红，而是幻化出霓虹般的神秘光芒。火焰的边缘跳动着金色与橙色的星点，如同灵魂在沸腾，每一次摇曳都释放出无尽的激情与力量，点燃了沉寂的夜空，预示着爆发的瞬间！',
    palette: ['#4a95e8', '#a02ae0', '#f0a35a'],
    emotion: { keywords: ['激情', '力量', '爆发'], semantic: '紫蓝主调的霓虹之火炽烈升腾，点燃沉寂夜空，预示爆发的激情。' },
    scenarios: ['电竞氛围', '演出现场', '动感场景', '派对高潮', '能量展示'],
  },
  {
    id: 'golden-wheat',
    index: 20,
    batch: 2,
    name: '金色麦浪',
    elements: ['金黄麦穗', '青色天幕'],
    description:
      '金色的阳光洒满大地，无边无际的麦浪如同柔顺的丝绸，随风轻柔地起伏摇曳。空气中弥漫着成熟的麦香。放眼望去，这片金黄色的海洋波光粼粼，每一株麦穗都在阳光下闪耀着温暖的光芒，仿佛能听见风与麦穗低语的宁静乐章。',
    palette: ['#4a7ba0', '#f5c842', '#f0a35a'],
    emotion: { keywords: ['丰收', '成熟', '宁静'], semantic: '金黄麦浪如丝绸随风起伏，闪耀温暖光芒，谱出成熟丰收的宁静乐章。' },
    scenarios: ['田园主题', '丰收庆典', '自然餐厅', '静心空间', '乡村度假'],
  },
  {
    id: 'maple-temple',
    index: 21,
    batch: 2,
    name: '枫寺藏秋',
    elements: ['凉亭', '红枫'],
    description:
      '古朴的亭子静默于秋色中，红色的枫叶如同禅者低垂的眼睑，缓缓、悠然地飘落。每一片叶子都承载着时光的静谧，轻触地面，发出细微而清净的声响。这一落，便是无言的禅意，将世间喧嚣化为一片安宁。',
    palette: ['#8a5a2a', '#e0402a', '#f0e8dc'],
    emotion: { keywords: ['禅意', '静谧', '安宁'], semantic: '红枫如禅者低垂眼睑悠然飘落，将世间喧嚣化为无言禅意的安宁。' },
    scenarios: ['禅意空间', '茶室', '东方美学', '静心冥想', '文化展陈'],
  },
  {
    id: 'hearth-fire',
    index: 22,
    batch: 2,
    name: '暖局炉火',
    elements: ['炉', '火焰'],
    description:
      '寒冷的冬夜，室内弥漫着温暖的橘色光芒。石砌的炉膛内，火焰正欢快而炽烈地燃烧着，发出噼啪的声响。它将周围的空气烤得暖融融的，柔和的光影在粗糙的木材和石块上跳跃，带来壁炉特有的宁静与安心。',
    palette: ['#6b3b1a', '#f0902a', '#f5dcb0'],
    emotion: { keywords: ['温暖', '安心', '围聚'], semantic: '石炉橘色火焰欢快跳跃，将空气烤得暖融融，带来壁炉特有的安心。' },
    scenarios: ['冬夜居家', '围炉时光', '木屋度假', '温馨会客', '壁炉主题'],
  },
  {
    id: 'city-neon',
    index: 23,
    batch: 2,
    name: '城市霓虹',
    elements: ['灯光光晕', '雨滴'],
    description:
      '蜷缩在温暖柔软的被窝里，听着窗外淅沥的雨声。抬眼望去，雨滴轻柔地拍打着玻璃，模糊了窗外的世界。远处的灯光在水雾中晕开，看来往的车辆缓缓驶过，带着一丝朦胧的暖意。整个世界仿佛被隔绝，只剩下这份独享的宁静与安适。',
    palette: ['#2a6aa0', '#f5d58a', '#6a8a8a'],
    emotion: { keywords: ['独处', '朦胧', '安适'], semantic: '雨滴模糊了窗外世界，远处灯光在水雾中晕开，只剩独享的宁静安适。' },
    scenarios: ['雨夜居家', '独处放松', '咖啡窗边', '深夜氛围', '疗愈过渡'],
  },
]

export const proposalScenes: ProposalScene[] = rawProposalScenes.map((s) => ({
  ...s,
  band: bandById[s.id] ?? 'neutral',
}))

export function paletteGradient(palette: string[]): string {
  if (palette.length === 1) return `linear-gradient(150deg, ${palette[0]}, ${palette[0]})`
  const stops = palette.map((c, i) => `${c} ${Math.round((i / (palette.length - 1)) * 100)}%`).join(', ')
  return `linear-gradient(150deg, ${stops})`
}
