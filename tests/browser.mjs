const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright")
import assert from "node:assert/strict"
const browser = await chromium.launch({ args: ["--no-sandbox"] })
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  ignoreHTTPSErrors: true,
  reducedMotion: "reduce",
})
const page = await context.newPage()
const errors = []
page.on("pageerror", (e) => errors.push(e.message))
const go = async () => {
  await page.goto(process.env.PREVIEW_URL || "http://localhost:3000/", {
    waitUntil: "networkidle",
  })
  await page.evaluate(() => document.fonts.ready)
}
const count = () => page.locator(".scene-tile").count()
const overflow = async (label) => {
  const r = await page.evaluate(() => ({
    viewport: innerWidth,
    document: document.documentElement.scrollWidth,
    dialog: document.querySelector('[role="dialog"]')?.scrollWidth,
  }))
  assert.ok(r.document <= r.viewport + 1, `${label}: ${JSON.stringify(r)}`)
  if (r.dialog)
    assert.ok(r.dialog <= r.viewport + 1, `${label}: dialog overflow`)
}
await go()
assert.equal(await count(), 42)
await page.getByRole("button", { name: "数据核验" }).click()
assert.ok((await page.locator(".validation-tag").innerText()).includes("42"))
assert.equal(
  await page.locator(".review-metrics strong").nth(1).innerText(),
  "—",
)
await page.screenshot({ path: "/tmp/nvc-final-desktop.png", fullPage: false })
await page.getByRole("button", { name: "数据核验" }).click()
await page.getByLabel("灯光数据", { exact: true }).selectOption("linked")
assert.equal(await count(), 7)
await page.getByRole("button", { name: "重置", exact: true }).click()
assert.equal(await count(), 42)
await page.getByLabel("搜索意境").fill("无此意境")
assert.equal(await count(), 0)
assert.ok(await page.getByRole("button", { name: "清除筛选" }).isVisible())
await page.getByRole("button", { name: "清除筛选" }).click()
await page.getByLabel("反馈状态", { exact: true }).selectOption("pending")
await page.getByRole("button", { name: "开始连续反馈" }).click()
let title = await page.locator("#scene-dialog-title").innerText()
await page.locator('[data-perceived="放松"]').click()
await page.getByRole("button", { name: "提交情绪反馈", exact: true }).click()
assert.ok(await page.getByRole("status").isVisible())
await page.getByRole("button", { name: "评价下一意境" }).click()
assert.notEqual(await page.locator("#scene-dialog-title").innerText(), title)
assert.ok((await page.getByRole("dialog").innerText()).includes("02 / 42"))
await page.keyboard.press("Escape")
assert.equal(await page.getByRole("dialog").count(), 0)
assert.equal(await count(), 41)
await page.getByLabel("分组方式").selectOption("subBand")
assert.equal(await count(), 41)
await page.getByLabel("分组方式").selectOption("subFamily")
assert.equal(await count(), 41)
await page.getByLabel("分组方式").selectOption("target")
assert.equal(await count(), 41)
await page.getByRole("button", { name: "重置", exact: true }).click()
await page.getByRole("button", { name: "查看旭日东升", exact: true }).click()
await page.getByRole("tab", { name: "灯光与音乐", exact: true }).click()
await page
  .getByRole("button", { name: "暂停", exact: true })
  .waitFor({ state: "visible" })
await page.getByRole("button", { name: "暂停", exact: true }).click()
assert.equal(
  await page.getByRole("button", { name: "播放", exact: true }).count(),
  1,
)
await page.getByRole("tab", { name: "模型验证依据" }).click()
await overflow("1440 modal")
await page.getByRole("tab", { name: "意境与光学" }).click()
await page.screenshot({ path: "/tmp/nvc-final-detail.png" })
for (const width of [1024, 768, 390, 320]) {
  await page.setViewportSize({ width, height: 900 })
  await overflow(`${width} modal`)
  const metrics = await page
    .locator('[role="dialog"] dd')
    .evaluateAll((es) =>
      es.filter(
        (e) =>
          e.getBoundingClientRect().width > 0 &&
          e.scrollWidth > e.clientWidth + 1,
      ).map((e) => ({
        text: e.textContent,
        w: e.clientWidth,
        scroll: e.scrollWidth,
      })),
    )
  assert.deepEqual(metrics, [], `numeric overflow at ${width}`)
  for (const tab of ["灯光与音乐", "模型验证依据"]) {
    await page.getByRole("tab", { name: tab, exact: true }).click()
    await overflow(`${width} ${tab}`)
  }
  await page.getByRole("tab", { name: "意境与光学" }).click()
}
await page.keyboard.press("Escape")
for (const width of [320, 390, 768, 1024, 1440]) {
  await page.setViewportSize({ width, height: 900 })
  await overflow(`${width} home`)
}
await page.setViewportSize({ width: 390, height: 844 })
await page.screenshot({ path: "/tmp/nvc-final-mobile.png" })
await page.getByRole("button", { name: "分类与筛选" }).click()
const presentTarget = await page.locator(".scene-target").first().innerText()
await page.getByLabel("情绪目标", { exact: true }).selectOption(presentTarget)
assert.ok((await count()) >= 1)
await page.getByRole("button", { name: "重置", exact: true }).click()
await page.locator(".scene-footer button").first().click()
assert.ok(await page.locator("#feedback-panel").isVisible())
await overflow("mobile feedback focus")
await page.keyboard.press("Escape")
await page
  .getByRole("button", { name: "用户反馈统计", exact: false })
  .first()
  .click()
await page
  .getByRole("heading", { name: "用户反馈统计 · 情绪感知权重", exact: true })
  .waitFor()
await page.getByText("条原始反馈 · 样本内对照", { exact: false }).waitFor()
await overflow("mobile feedback statistics")
assert.ok((await page.locator("main").innerText()).includes("样本内对照"))
await page.getByRole("button", { name: "实验室", exact: true }).click()
await page
  .getByRole("heading", { name: "实验室与数据校准", exact: true })
  .waitFor()
await overflow("mobile lab")
await page.getByRole("button", { name: "多模态上传分析", exact: true }).click()
assert.ok((await page.locator('input[type="file"]').count()) > 0)
await page.getByRole("button", { name: "理论论据", exact: true }).click()
await page
  .getByRole("heading", { name: "情绪验证理论论据", exact: true })
  .waitFor()
await overflow("mobile theory")
assert.deepEqual(errors, [])
console.log(
  JSON.stringify(
    {
      result: "PASS",
      scenes: 42,
      ledFiles: 7,
      viewports: [320, 390, 768, 1024, 1440],
      checks: [
        "filter counts",
        "search/empty/reset",
        "queue after feedback",
        "SAM submission",
        "9-way grouping coverage",
        "LED play/pause",
        "modal tabs",
        "numeric overflow",
        "mobile feedback focus",
        "feedback statistics",
        "laboratory navigation",
        "theory navigation",
      ],
      pageErrors: errors,
    },
    null,
    2,
  ),
)
await browser.close()
