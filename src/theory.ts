// 情绪验证理论论据：论点 → 系统实现 → 文献
// 注：系统中的系数为依据文献趋势建立的工程化近似，并非对原研究的直接复现。
import { emotionTargets } from "./emotion"

export interface Reference {
  id: string
  text: string
}

export interface Claim {
  title: string
  /** 理论观点 */
  point: string
  /** 在本系统中的实现 */
  impl: string
  refs: string[]
}

export interface TheorySection {
  id: string
  no: string
  title: string
  en: string
  lead: string
  claims: Claim[]
}

export const references: Reference[] = [
  {
    id: "mehrabian1974",
    text: "Mehrabian, A., & Russell, J. A. (1974). An Approach to Environmental Psychology. Cambridge, MA: MIT Press.",
  },
  {
    id: "russell1980",
    text: "Russell, J. A. (1980). A circumplex model of affect. Journal of Personality and Social Psychology, 39(6), 1161–1178.",
  },
  {
    id: "bradley1994",
    text: "Bradley, M. M., & Lang, P. J. (1994). Measuring emotion: The Self-Assessment Manikin and the semantic differential. Journal of Behavior Therapy and Experimental Psychiatry, 25(1), 49–59.",
  },
  {
    id: "valdez1994",
    text: "Valdez, P., & Mehrabian, A. (1994). Effects of color on emotions. Journal of Experimental Psychology: General, 123(4), 394–409.",
  },
  {
    id: "ou2004",
    text: "Ou, L.-C., Luo, M. R., Woodcock, A., & Wright, A. (2004). A study of colour emotion and colour preference. Part I: Colour emotions for single colours. Color Research & Application, 29(3), 232–240.",
  },
  {
    id: "wilms2018",
    text: "Wilms, L., & Oberfeld, D. (2018). Color and emotion: Effects of hue, saturation, and brightness. Psychological Research, 82(5), 896–914.",
  },
  {
    id: "kruithof1941",
    text: "Kruithof, A. A. (1941). Tubular luminescence lamps for general illumination. Philips Technical Review, 6, 65–96.",
  },
  {
    id: "fotios2017",
    text: "Fotios, S. (2017). A revised Kruithof graph based on empirical data. LEUKOS, 13(1), 3–17.",
  },
  {
    id: "cie2018",
    text: "CIE S 026/E:2018. CIE System for Metrology of Optical Radiation for ipRGC-Influenced Responses to Light. Vienna: CIE.",
  },
  {
    id: "lucas2014",
    text: "Lucas, R. J., Peirson, S. N., Berson, D. M., et al. (2014). Measuring and using light in the melanopsin age. Trends in Neurosciences, 37(1), 1–9.",
  },
  {
    id: "cajochen2000",
    text: "Cajochen, C., Zeitzer, J. M., Czeisler, C. A., & Dijk, D. J. (2000). Dose-response relationship for light intensity and ocular and electroencephalographic correlates of human alertness. Behavioural Brain Research, 115(1), 75–83.",
  },
  {
    id: "chellappa2011",
    text: "Chellappa, S. L., Steiner, R., Blattner, P., et al. (2011). Non-visual effects of light on melatonin, alertness and cognitive performance: Can blue-enriched light keep us alert? PLoS ONE, 6(1), e16429.",
  },
  {
    id: "baron1992",
    text: "Baron, R. A., Rea, M. S., & Daniels, S. G. (1992). Effects of indoor lighting (illuminance and spectral distribution) on the performance of cognitive tasks and interpersonal behaviors: The potential mediating role of positive affect. Motivation and Emotion, 16(1), 1–33.",
  },
  {
    id: "ohno2014",
    text: "Ohno, Y., & Fein, M. (2014). Vision experiment on acceptable and preferred white light chromaticity for lighting. In CIE x039:2014, Proceedings of the CIE 2014 Lighting Quality and Energy Efficiency (pp. 192–199).",
  },
  {
    id: "tm30",
    text: "ANSI/IES TM-30-20 (2020). IES Method for Evaluating Light Source Color Rendition. New York: Illuminating Engineering Society.",
  },
  {
    id: "ieee1789",
    text: "IEEE Std 1789-2015. IEEE Recommended Practices for Modulating Current in High-Brightness LEDs for Mitigating Health Risks to Viewers.",
  },
  {
    id: "kuijsters2015",
    text: "Kuijsters, A., Redi, J., de Ruyter, B., & Heynderickx, I. (2015). Lighting to make you feel better: Improving the mood of elderly people with affective ambiences. PLoS ONE, 10(7), e0132732.",
  },
  {
    id: "hevner1935",
    text: "Hevner, K. (1935). The affective character of the major and minor modes in music. The American Journal of Psychology, 47(1), 103–118.",
  },
  {
    id: "hevner1937",
    text: "Hevner, K. (1937). The affective value of pitch and tempo in music. The American Journal of Psychology, 49(4), 621–630.",
  },
  {
    id: "gabrielsson2010",
    text: "Gabrielsson, A., & Lindström, E. (2010). The role of structure in the musical expression of emotions. In P. N. Juslin & J. A. Sloboda (Eds.), Handbook of Music and Emotion (pp. 367–400). Oxford University Press.",
  },
  {
    id: "juslin2008",
    text: "Juslin, P. N., & Västfjäll, D. (2008). Emotional responses to music: The need to consider underlying mechanisms. Behavioral and Brain Sciences, 31(5), 559–575.",
  },
  {
    id: "spence2011",
    text: "Spence, C. (2011). Crossmodal correspondences: A tutorial review. Attention, Perception, & Psychophysics, 73(4), 971–995.",
  },
  {
    id: "palmer2013",
    text: "Palmer, S. E., Schloss, K. B., Xu, Z., & Prado-León, L. R. (2013). Music–color associations are mediated by emotion. PNAS, 110(22), 8836–8841.",
  },
  {
    id: "kaplan1995",
    text: "Kaplan, S. (1995). The restorative benefits of nature: Toward an integrative framework. Journal of Environmental Psychology, 15(3), 169–182.",
  },
  {
    id: "ulrich1991",
    text: "Ulrich, R. S., Simons, R. F., Losito, B. D., et al. (1991). Stress recovery during exposure to natural and urban environments. Journal of Environmental Psychology, 11(3), 201–230.",
  },
  {
    id: "taskforce1996",
    text: "Task Force of the European Society of Cardiology and the North American Society of Pacing and Electrophysiology (1996). Heart rate variability: Standards of measurement, physiological interpretation, and clinical use. Circulation, 93(5), 1043–1065.",
  },
  {
    id: "boucsein2012",
    text: "Boucsein, W. (2012). Electrodermal Activity (2nd ed.). New York: Springer.",
  },
  {
    id: "buhlmann1967",
    text: "Bühlmann, H. (1967). Experience rating and credibility. ASTIN Bulletin, 4(3), 199–207.",
  },
]

export const sections: TheorySection[] = [
  {
    id: "frame",
    no: "01",
    title: "情绪度量框架",
    en: "MEASURING EMOTION",
    lead: "以可量化、可复测的维度描述情绪，是“光色 → 情绪”验证的前提。",
    claims: [
      {
        title: "PAD 三维情绪模型",
        point:
          "环境引发的情绪反应可用愉悦度（Pleasure）、唤醒度（Arousal）、支配/控制感（Dominance）三个近似独立的维度描述，并进而影响接近或回避等行为。",
        impl: "所有素材、上传分析、灯光实发与用户反馈统一映射到 PAD ∈ [−1, 1]³；圆点大小表示 D。",
        refs: ["mehrabian1974"],
      },
      {
        title: "情绪环形模型（Circumplex）",
        point:
          "情绪状态可排布在“效价 × 唤醒”二维平面上，形成连续的环形结构，相邻情绪相似、对角情绪相反。",
        impl: `模型横轴 P、纵轴 A；${emotionTargets.length} 个情绪标签以 PAD 原型距离判定。原型由工程规则定义，未完成独立实验标定。`,
        refs: ["russell1980"],
      },
      {
        title: "SAM 自评小人量表",
        point:
          "SAM 以非文字图示直接测量效价、唤醒与支配，跨语言、跨年龄稳定，与语义差异量表高度相关，适合快速施测。",
        impl: "用户反馈表单采用 SAM 1–9 分制，按 (x − 5) / 4 换算为 PAD，与模型坐标直接对比。",
        refs: ["bradley1994"],
      },
    ],
  },
  {
    id: "color",
    no: "02",
    title: "色彩与情绪",
    en: "COLOR & EMOTION",
    lead: "色彩的明度与饱和度对情绪维度有稳定影响，色相的作用相对较弱且受文化影响。",
    claims: [
      {
        title: "明度、饱和度 → PAD 回归",
        point:
          "愉悦度主要随明度上升而上升；唤醒度随饱和度上升而上升、随明度上升而略降；支配感随明度上升而下降、随饱和度上升而上升。",
        impl: "当前色彩唤醒项采用 [0.24·(B−0.52)+0.55·S−0.16]/0.35，再叠加冷暖与对比修正。这是自发光场景的工程假设，明度系数已不同于原研究，不能作为原论文回归结论或效果证据。",
        refs: ["valdez1994", "wilms2018"],
      },
      {
        title: "色彩情绪维度：冷暖、轻重、主动被动",
        point:
          "单色情绪可归纳为“暖—冷”“重—轻”“主动—被动”等少数因子；暖色与高饱和色更具主动、激活感。",
        impl: "冷暖倾向以色相与 35°（橙）的夹角余弦 × 饱和度计算，作为唤醒度修正项与情绪基调（暖 / 中性 / 冷）划分依据。",
        refs: ["ou2004"],
      },
    ],
  },
  {
    id: "light",
    no: "03",
    title: "空间光环境与情绪",
    en: "LIGHT ENVIRONMENT",
    lead: "色温、照度、光谱的非视觉效应与色品偏好共同决定空间“感觉起来”的样子。",
    claims: [
      {
        title: "色温 × 照度的舒适区",
        point:
          "低照度宜配低色温、高照度宜配高色温方显舒适；后续实证研究对原曲线的适用性提出修正，提示舒适区应结合场景实测。",
        impl: "光色维度的愉悦项以约 4800K 为中心、随偏离程度递减；照度用于唤醒与控制项；实测数据优先于经验曲线。",
        refs: ["kruithof1941", "fotios2017"],
      },
      {
        title: "黑视素（ipRGC）通路与警觉",
        point:
          "富含短波（蓝）成分的光通过 ipRGC 抑制褪黑素、提升主观警觉与认知表现；照度越高，警觉效应越强（剂量-反应关系）。",
        impl: "当前工程唤醒项为 0.32·CCT 项·微光修正 + 0.23·MR 项·微光修正 + 0.45·可用光量项。MR 的色温近似不等于实测 melanopic EDI；光通量、照度与画面明度不能直接换算。系数与分档尚待受控实验验证。",
        refs: ["cie2018", "lucas2014", "cajochen2000", "chellappa2011"],
      },
      {
        title: "照明—正性情绪—行为",
        point:
          "室内照度与光谱分布可通过诱发正性情绪，间接影响认知任务表现与人际行为。",
        impl: "把“光 → 情绪 → 行为”作为验证链，反馈中同时记录主观情绪与注意力 / 舒适度指标。",
        refs: ["baron1992"],
      },
      {
        title: "色品偏好：略低于黑体轨迹的白光",
        point: "受试者对略低于黑体轨迹（Duv 为负）的白光有更高的偏好与接受度。",
        impl: "光色愉悦项含 −Duv 修正，但仅在白光附近（|Duv| ≤ 0.008）生效；|Duv| > 0.02 的彩色光，其光色权重自动下调。",
        refs: ["ohno2014"],
      },
      {
        title: "显色质量",
        point:
          "显色保真度（Rf）与色域（Rg）影响物体色彩的真实感与鲜艳度，是“舒适、自然”感知的重要基础。",
        impl: "彩光实测 Ra / R9 进入光色维度愉悦项；方案建议 Ra ≥ 90、R9 ≥ 50，具备条件时补测 TM-30 Rf / Rg。",
        refs: ["tm30"],
      },
    ],
  },
  {
    id: "dynamic",
    no: "04",
    title: "动态光与 RGB 混色",
    en: "DYNAMIC & RGB MIXING",
    lead: "动态光效带来的变化节奏本身就是情绪信号，但必须在无可视频闪的前提下实现。",
    claims: [
      {
        title: "情感化照明氛围",
        point:
          "以色彩、亮度与动态组合构建的“情感化光氛围”可在真实空间中改善人的情绪状态。",
        impl: "动态维度：变化速率、亮度波动、突变事件率提升唤醒度；突变与过快变化降低愉悦度；均匀度提升控制感；≥ 8s 的慢呼吸周期提升愉悦度。",
        refs: ["kuijsters2015"],
      },
      {
        title: "调光频闪的健康风险",
        point:
          "LED 调制频率与调制深度共同决定频闪风险；推荐在低风险区工作以避免头痛、视疲劳等不良反应。",
        impl: "方案输出 PWM ≥ 2000 Hz，动态 / 视频场景 ≥ 3125 Hz，作为情绪验证实验的安全前提。",
        refs: ["ieee1789"],
      },
      {
        title: "RGB 三色加法混色",
        point:
          "混合光的三刺激值等于各通道三刺激值之和（Grassmann 加法定律），色度可由单色实测原色与驱动强度精确推算。",
        impl: "整灯 XYZ = Σ (d/255)^γ × 单色满载 XYZ；γ 由 bin 驱动值与积分球彩光实测拟合（γ≈1.6，平均 Δxy≈0.017）；有实测时情绪坐标采用实测光色。",
        refs: ["cie2018"],
      },
    ],
  },
  {
    id: "music",
    no: "05",
    title: "音乐与跨模态一致",
    en: "MUSIC & CROSSMODAL",
    lead: "音乐的结构参数可预测其表达的情绪；与光色情绪一致时，多感官体验更强、更可信。",
    claims: [
      {
        title: "调式与速度的情绪价值",
        point:
          "大调更多被评为愉快、明亮，小调更多被评为忧伤、沉郁；速度是唤醒程度最主要的结构线索之一。",
        impl: "音乐维度：大调 / 五声音阶提升愉悦度，小调降低；BPM 为唤醒度主项（另含响度、节奏密度、频谱重心）。",
        refs: ["hevner1935", "hevner1937", "gabrielsson2010"],
      },
      {
        title: "音乐诱发情绪的心理机制",
        point:
          "音乐可通过脑干反射、节律同步（entrainment）、情绪感染、视觉想象等多种机制诱发情绪。",
        impl: "匹配音乐模块按节律同步思路，将乐句长度对齐灯光呼吸周期、在灯光突变点安排重音。",
        refs: ["juslin2008"],
      },
      {
        title: "跨模态对应与情绪中介",
        point:
          "人对音高、亮度、色彩等跨感官属性存在系统性对应；音乐—色彩联想在很大程度上由共同的情绪内涵介导。",
        impl: "以 PAD 作为光与音乐的共同空间：音乐 × 画面一致性 = 1 − 两者 PAD 距离 / 1.6；上传音乐检验中情绪一致性占 60%。",
        refs: ["spence2011", "palmer2013"],
      },
    ],
  },
  {
    id: "nature",
    no: "06",
    title: "自然场景的恢复效应",
    en: "RESTORATIVE NATURE",
    lead: "“动态自然场景”系列的理论依据：自然意象有助于注意力恢复与压力缓解。",
    claims: [
      {
        title: "注意恢复理论（ART）",
        point: "自然环境以“柔性吸引”让定向注意得到休息，从而恢复注意力资源。",
        impl: "画面语义中“自然 / 水景 / 空间开阔”标签具有正向愉悦、偏低唤醒的先验；对应情绪假设包含“轻度提升注意恢复能力”。",
        refs: ["kaplan1995"],
      },
      {
        title: "压力恢复理论（SRT）",
        point: "在压力后接触自然场景，比城市场景更快地恢复生理与主观压力指标。",
        impl: "自然类素材的推荐音乐提高自然声占比（30%–50%）；验证指标包含 HRV、GSR 与压力感评分。",
        refs: ["ulrich1991"],
      },
    ],
  },
  {
    id: "validation",
    no: "07",
    title: "验证方法与证据整合",
    en: "VALIDATION & EVIDENCE",
    lead: "以生理与主观双通道测量情绪，并用可解释的统计方法把用户反馈逐步纳入模型。",
    claims: [
      {
        title: "心率变异性（HRV）",
        point:
          "HRV 的时域与频域指标反映自主神经平衡，需按标准化方法采集与解读。",
        impl: "L3 证据等级要求补充 HRV 等生理指标；放松 / 疗愈类素材以 HRV 提升为预期方向。",
        refs: ["taskforce1996"],
      },
      {
        title: "皮肤电活动（EDA / GSR）",
        point: "皮肤电导反映交感神经激活，是唤醒度较为直接的生理标记。",
        impl: "唤醒度假设（A）以 GSR 变化验证；警醒 / 活力类素材预期 GSR 上升。",
        refs: ["boucsein2012"],
      },
      {
        title: "被试内 A / B / C 对照",
        point:
          "同一被试依次体验基线、色彩光、多模态三种条件并随机化顺序，可抵消个体差异与顺序效应。",
        impl: "反馈记录可标注实验条件，统计页给出 B、C 相对 A 的愉悦度与舒适度变化百分比。",
        refs: [],
      },
      {
        title: "可信度加权（Credibility）",
        point:
          "当先验估计与观测数据并存时，按样本量对两者加权：样本越多越信任观测，样本少时保留先验约束。",
        impl: "校准坐标 = (1 − w)·模型 + w·反馈均值，w = min(0.85, n / (n + k))，k 为先验强度（默认 10）；n ≥ 5 且多数一致时采用多数感知标签。",
        refs: ["buhlmann1967"],
      },
    ],
  },
]

export const paramMap: {
  param: string
  formula: string
  basis: string
  refs: string[]
}[] = [
  {
    param: "PAD 坐标空间",
    formula: "P, A, D ∈ [−1, 1]",
    basis: "PAD 模型 · 环形模型",
    refs: ["mehrabian1974", "russell1980"],
  },
  {
    param: "色彩 → PAD",
    formula: "A=[.24(B−.52)+.55S−.16]/.35 + 冷暖/对比修正",
    basis: "工程假设，不是原研究复现",
    refs: ["valdez1994"],
  },
  {
    param: "冷暖倾向",
    formula: "Σ cos(h − 35°)·s / N",
    basis: "色彩情绪因子",
    refs: ["ou2004"],
  },
  {
    param: "色温 / 光量 → 唤醒",
    formula: ".32·CCT·修正 + .23·MR·修正 + .45·光量",
    basis: "工程近似，需光谱/眼部照度实测验证",
    refs: ["cie2018", "chellappa2011", "cajochen2000"],
  },
  {
    param: "Duv 偏好",
    formula: "−25·Duv（|Duv| ≤ 0.008）",
    basis: "白光色品偏好",
    refs: ["ohno2014"],
  },
  {
    param: "动态 → 唤醒",
    formula: "0.45·速率 + 0.25·波动 + 0.6·突变",
    basis: "情感化光氛围",
    refs: ["kuijsters2015"],
  },
  {
    param: "PWM 下限",
    formula: "≥ 2000 Hz / 视频 ≥ 3125 Hz",
    basis: "频闪风险",
    refs: ["ieee1789"],
  },
  {
    param: "音乐 → PAD",
    formula: "调式→P · BPM/响度/密度→A",
    basis: "调式与速度",
    refs: ["hevner1935", "hevner1937", "gabrielsson2010"],
  },
  {
    param: "光 × 音乐一致性",
    formula: "1 − d_PAD / 1.6",
    basis: "跨模态情绪中介",
    refs: ["palmer2013", "spence2011"],
  },
  {
    param: "SAM → PAD",
    formula: "(x − 5) / 4",
    basis: "SAM 量表",
    refs: ["bradley1994"],
  },
  {
    param: "反馈权重",
    formula: "w = min(.85, n/(n+k))",
    basis: "可信度加权",
    refs: ["buhlmann1967"],
  },
]

export const evidenceLevels = [
  { level: "L1", name: "理论推断", need: "模型由文献规律推算，无人群数据" },
  { level: "L2", name: "小样本主观验证", need: "单素材 ≥ 5 条 SAM 反馈" },
  { level: "L3", name: "主观 + 生理", need: "SAM + HRV / GSR 同步采集" },
  { level: "L4", name: "多场景重复验证", need: "多空间、多人群重复实验一致" },
  { level: "L5", name: "商业场景长期验证", need: "真实项目长期跟踪与行为数据" },
]
