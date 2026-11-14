import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync, existsSync } from "node:fs"
import { scenes } from "../src/scenes"
import { proposalScenes } from "../src/proposal"
import {
  emotionTargets,
  rankTargets,
  nearestTarget,
  lightVec,
} from "../src/emotion"
import {
  buildCatalog,
  groupDims,
  groupKey,
  dimValues,
  subBandMeta,
  subFamilyMeta,
  arousalBandOf,
  summarizeArousal,
} from "../src/catalog"
import {
  itemStats,
  samToPad,
  parseFeedbackFile,
  normalizeImport,
  toCSV,
  mergeFeedback,
} from "../src/feedback"
import { analyzeClip, makeClip, applyGamma } from "../src/analyze/ledbin"
import { DRIVE_GAMMA, FULL_FLUX } from "../src/lightSource"
import { auditCatalog } from "../src/dataAudit"
import {
  filterCatalog,
  emptyFilters,
  countGroups,
  nextSceneId,
} from "../src/catalogView"

const preset = JSON.parse(readFileSync("src/data/led-analyses.json", "utf8"))
const entries = preset.map((e) => applyGamma(e, DRIVE_GAMMA))
const { items } = buildCatalog(entries)
const record = (overrides = {}) => ({
  id: "test-feedback",
  item: items[0].id,
  at: 1700000000000,
  perceived: "放松",
  valence: 5,
  arousal: 5,
  dominance: 5,
  comfort: 3,
  condition: "B",
  ...overrides,
})
const valid = new Set(items.map((i) => i.id))

test("所有素材唯一、层级完整、PAD/光学值有效、无反馈不伪造准确率", () => {
  assert.equal(items.length, scenes.length + proposalScenes.length)
  assert.equal(emotionTargets.length, 29)
  assert.equal(Object.keys(subBandMeta).length, 9)
  assert.equal(Object.keys(subFamilyMeta).length, 8)
  assert.deepEqual(auditCatalog(items).issues, [])
  for (const i of items) {
    assert.equal(i.arousal.feedbackAccuracy, null)
    assert.equal(
      i.brightness,
      Math.round(i.led?.emission.luminance ?? i.design.colorParams.brightness),
    )
  }
})

test("九种分组均完整覆盖素材，无丢失或重复；筛选数量与分组数量一致", () => {
  for (const d of groupDims) {
    const values =
      d.id === "target"
        ? emotionTargets.map((t) => t.name)
        : dimValues[d.id].map((v) => v.key)
    const counts = countGroups(items, d.id)
    assert.equal(
      Object.values(counts).reduce((a, b) => a + b, 0),
      items.length,
    )
    items.forEach((i) =>
      assert.ok(values.includes(groupKey(i, d.id)), `${i.id}: ${d.id}`),
    )
  }
  for (const b of dimValues.band) {
    const filtered = filterCatalog(items, { ...emptyFilters, band: b.key })
    assert.equal(filtered.length, countGroups(items, "band")[b.key] ?? 0)
    filtered.forEach((i) => assert.equal(subBandMeta[i.subBand].parent, b.key))
  }
  assert.equal(
    filterCatalog(items, { ...emptyFilters, query: "旭日东升" }).length,
    1,
  )
  assert.equal(
    filterCatalog(items, { ...emptyFilters, query: "不存在的意境" }).length,
    0,
  )
})

test("SAM 归一化与唤醒分档边界精确", () => {
  assert.deepEqual(samToPad({ valence: 1, arousal: 5, dominance: 9 }), {
    p: -1,
    a: 0,
    d: 1,
  })
  assert.equal(arousalBandOf(-0.200001), "low")
  assert.equal(arousalBandOf(-0.2), "mid")
  assert.equal(arousalBandOf(0.2), "high")
})

test("空 LED 数据、无效走线与越界帧率明确拒绝，不输出 NaN", () => {
  assert.throws(() => makeClip("bad", new Uint8Array(), [[0, 0]], 25))
  assert.throws(() => makeClip("bad", new Uint8Array(8), [], 25))
  assert.throws(() => makeClip("bad", new Uint8Array(8), [[-1, 0]], 25))
  assert.throws(() => makeClip("bad", new Uint8Array(8), [[0, 0]], 0))
  assert.throws(() => makeClip("bad", new Uint8Array(8), [[0, 0]], 999))
})

test("模型与原始 SAM 逐条比较：无最低保底分，且不受先验校准权重影响", () => {
  const id = items[0].id
  const modelBand = arousalBandOf(items[0].model.v.a)
  const match = modelBand === "low" ? 1 : modelBand === "high" ? 9 : 5
  const miss = modelBand === "low" ? 9 : 1
  const rs = [record({ arousal: match }), record({ id: "b", arousal: miss })]
  const a = buildCatalog(entries, { [id]: rs }, 1).byId[id]
  const b = buildCatalog(entries, { [id]: rs }, 50).byId[id]
  assert.equal(a.arousal.feedbackAccuracy, 50)
  assert.equal(a.arousal.feedbackAccuracy, b.arousal.feedbackAccuracy)
  assert.equal(a.arousal.feedbackN, 2)
  const allMiss = buildCatalog(entries, { [id]: [record({ arousal: miss })] })
    .byId[id]
  assert.equal(allMiss.arousal.feedbackAccuracy, 0)
  assert.equal(summarizeArousal([a]).feedbackAccuracy, 50)
  assert.equal(summarizeArousal([]).meanConsistency, null)
  assert.equal(summarizeArousal([]).feedbackAccuracy, null)
  assert.equal(summarizeArousal([]).byBand.low.consistencyScore, null)
})

test("反馈平票不是多数；计数、校准权重与次要标签无重复", () => {
  const model = { v: items[0].model.v, target: items[0].model.target }
  const rs = Array.from({ length: 6 }, (_, n) =>
    record({ id: String(n), perceived: n < 3 ? "放松" : "宁静" }),
  )
  const stats = itemStats(rs, model)
  assert.notEqual(stats.finalBasis, "majority")
  assert.equal(stats.n, 6)
  assert.ok(stats.weight <= 0.85)
  assert.deepEqual(
    auditCatalog(buildCatalog(entries, { [items[0].id]: rs }).items).issues,
    [],
  )
})

test("JSON / CSV 回传保持时间戳和数据，重复导入不增加条数", () => {
  const r = record({ note: "含逗号,与\\n换行" })
  for (const [file, text] of [
    ["test.json", JSON.stringify({ records: [r] })],
    ["test.csv", toCSV([r])],
  ]) {
    const result = normalizeImport(parseFeedbackFile(file, text), valid)
    assert.deepEqual(result.errors, [])
    assert.equal(result.ok[0].at, r.at)
    assert.equal(result.ok[0].note, r.note)
    assert.equal(mergeFeedback([r], result.ok).length, 1)
  }
})

test("无效导入值不能悄悄截断成合法数据", () => {
  const invalid = [
    null,
    1,
    record({ arousal: "" }),
    record({ arousal: 1.5 }),
    record({ comfort: 7 }),
    record({ at: "bad-date" }),
    record({ item: "missing" }),
    record({ condition: "D" }),
    record({ perceived: "不存在的标签" }),
  ]
  const result = normalizeImport(invalid, valid)
  assert.equal(result.ok.length, 0)
  assert.equal(result.errors.length, invalid.length)
  assert.deepEqual(parseFeedbackFile("empty.csv", ""), [])
})

test("测评快照不会因反馈后筛选移除当前项而跳过下一项", () => {
  const queue = items.slice(0, 3).map((i) => i.id)
  const reviewed = buildCatalog(entries, { [queue[0]]: [record()] }).items
  assert.ok(
    !filterCatalog(reviewed, { ...emptyFilters, feedback: "pending" }).some(
      (i) => i.id === queue[0],
    ),
  )
  assert.equal(nextSceneId(queue, queue[0], 1), queue[1])
  assert.equal(nextSceneId(queue, queue[0], -1), queue[2])
})

test("光量变化确实进入计算；标签排名与最近原型一致", () => {
  const l = {
    cct: 5000,
    lux: null,
    mr: 0.8,
    cri: 90,
    duv: 0,
    x: 0.3,
    y: 0.3,
    measured: false,
  }
  assert.ok(
    lightVec({ ...l, flux: 18000, brightness: 90 }).a >
      lightVec({ ...l, flux: 1000, brightness: 10 }).a,
  )
  for (const e of entries) {
    assert.equal(e.target, nearestTarget(e.combined))
    assert.equal(e.ranked[0].name, rankTargets(e.combined, 1)[0].target.name)
    assert.ok(e.emission.flux > 0 && e.emission.flux < FULL_FLUX)
    assert.ok(
      Math.abs(Object.values(e.weights).reduce((a, b) => a + b, 0) - 1) < 1e-9,
    )
  }
  const lowGamma = applyGamma(preset[0], 1)
  const highGamma = applyGamma(preset[0], 3)
  assert.ok(lowGamma.emission.model.flux > highGamma.emission.model.flux)
  assert.ok(lowGamma.emission.luminance > highGamma.emission.luminance)
  assert.equal(
    lowGamma.emission.measured.flux,
    highGamma.emission.measured.flux,
  )
})

test("白光与彩光测量不混用；后导入数据优先，人工次要标签保留", () => {
  for (const i of items.filter((i) => i.kind === "mood")) {
    assert.equal(i.design.lightParams.flux, null)
    assert.equal(i.design.lightParams.brightness, null)
  }
  const base = entries[0]
  const override = {
    ...base,
    id: "session-override",
    emission: { ...base.emission, flux: 1234, cct: 4500, source: "model" },
    manual: { target: "放松", secondary: ["禅定", "宁静"], at: 1700000000000 },
    target: "放松",
  }
  const i = buildCatalog([...entries, override]).byId[base.linkedId]
  assert.equal(i.flux, 1234)
  assert.equal(i.cct, 4500)
  assert.equal(i.fluxSource, "model")
  assert.deepEqual(
    i.effective.secondary.map((r) => r.name),
    ["禅定", "宁静"],
  )
})

test("七个 manifest 文件真实存在，走线/帧数/关联/实测字段与重新解析一致", () => {
  const manifest = JSON.parse(readFileSync("public/led/manifest.json", "utf8"))
  const mapping = JSON.parse(readFileSync("public/led/dian.json", "utf8"))
  assert.equal(new Set(mapping.map((p) => p.join(","))).size, mapping.length)
  for (const m of manifest.clips) {
    assert.ok(existsSync(`public/led/${m.file}`))
    const e = entries.find((e) => e.src === `led/${m.file}`)
    assert.ok(e, m.file)
    assert.equal(e.linkedId, m.scene)
    const fresh = analyzeClip(
      makeClip(
        m.name,
        new Uint8Array(readFileSync(`public/led/${m.file}`)),
        mapping,
        m.fps,
      ),
      { id: e.id, fileName: m.name, linkId: m.scene },
    )
    assert.equal(fresh.frames, e.frames)
    assert.equal(fresh.count, mapping.length)
    assert.equal(fresh.duration, e.duration)
    assert.equal(fresh.emission.flux, e.emission.flux)
    assert.equal(fresh.target, e.target)
    assert.ok(Math.abs(fresh.combined.a - e.combined.a) < 1e-8)
  }
})

test("人工坐标同步更新模型与唤醒分档，恢复后使用原模型", async () => {
  const { coordinateOverride } = await import("../src/coordinateModel")
  const id = items[0].id
  const edited = buildCatalog(entries, {}, 10, {
    [id]: { p: 0.2, a: -0.8, d: 0.1 },
  }).byId[id]
  assert.equal(edited.model.v.a, -0.8)
  assert.equal(edited.arousal.a, -0.8)
  assert.equal(edited.arousal.band, "low")
  assert.equal(edited.effective.target, nearestTarget(edited.model.v))
  const withFeedback = buildCatalog(
    entries,
    { [id]: [record({ arousal: 9 })] },
    10,
    { [id]: { p: 0.2, a: -0.8, d: 0.1 } },
  ).byId[id]
  assert.ok(
    Math.abs(
      withFeedback.arousal.a -
        ((1 - withFeedback.stats.weight) * -0.8 + withFeedback.stats.weight),
    ) < 1e-9,
  )
  assert.equal(buildCatalog(entries).byId[id].model.v.a, items[0].model.v.a)
  assert.deepEqual(coordinateOverride({ p: 2, a: -2, d: 0 }), {
    p: 1,
    a: -1,
    d: 0,
  })
  assert.throws(() => coordinateOverride({ p: NaN, a: 0, d: 0 }))
})

test("CIE xy 色彩转换与三角形边界正确", async () => {
  const { xyToSrgb, insideTriangle } = await import("../src/cieColor")
  const { primaries } = await import("../src/lightSource")
  const white = xyToSrgb(0.3127, 0.329)
  assert.ok(Math.max(...white) - Math.min(...white) < 3)
  assert.ok(primaries.every((p) => insideTriangle(p.x, p.y, primaries)))
  assert.equal(insideTriangle(0.12, 0.54, primaries), false)
  assert.ok(
    xyToSrgb(primaries[0].x, primaries[0].y)[0] >
      xyToSrgb(primaries[0].x, primaries[0].y)[2],
  )
  assert.deepEqual(xyToSrgb(0, 0), [0, 0, 0])
})
