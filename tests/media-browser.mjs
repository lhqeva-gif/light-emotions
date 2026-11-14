import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright")
const browser = await chromium.launch({ args: ["--no-sandbox"] })
const page = await browser.newPage({
  ignoreHTTPSErrors: true,
  viewport: { width: 1440, height: 1000 },
})
const errors = []
page.on("pageerror", (e) => errors.push(e.message))
await page.goto(process.env.PREVIEW_URL || "http://localhost:3000/", {
  waitUntil: "networkidle",
})
const preset = JSON.parse(readFileSync("src/data/led-analyses.json", "utf8"))
for (const e of preset) {
  await page.getByRole("button", { name: `查看${e.name}`, exact: true }).click()
  await page.waitForFunction(
    () =>
      Number(
        document.querySelector('input[aria-label="LED 回放进度"]')?.value,
      ) > 0.3,
  )
  await page.getByRole("button", { name: "暂停", exact: true }).click()
  assert.ok(
    await page.getByRole("button", { name: "播放", exact: true }).isVisible(),
  )
  await page.keyboard.press("Escape")
}
await page.getByRole("button", { name: "查看旭日东升", exact: true }).click()
await page.getByRole("button", { name: "编辑情绪坐标", exact: true }).click()
await page.getByLabel("编辑坐标 A", { exact: true }).fill("-.8")
await page.getByRole("button", { name: "应用坐标", exact: true }).click()
assert.ok(
  (await page.locator('[role="dialog"]').innerText()).includes("生效 A -0.80"),
)
assert.ok(
  (await page.locator('[role="dialog"]').innerText()).includes("低唤醒"),
)
const svg = page.getByLabel("情绪坐标编辑平面", { exact: true })
const box = await svg.boundingBox()
await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5)
await page.mouse.down()
await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.25)
await page.mouse.up()
await page.getByRole("button", { name: "应用坐标", exact: true }).click()
assert.ok(
  Number(await page.getByLabel("编辑坐标 A", { exact: true }).inputValue()) >
    0.4,
)
await page.getByRole("button", { name: "恢复原始模型", exact: true }).click()
assert.ok(
  (await page.locator('[role="dialog"]').innerText()).includes(
    "已恢复原始模型",
  ),
)
await page.getByRole("tab", { name: "意境与光学", exact: true }).click()
assert.ok(
  (
    await page.locator('[data-testid="cie-color-image"]').getAttribute("href")
  ).startsWith("data:image/png"),
)
await page.setViewportSize({ width: 390, height: 844 })
assert.ok(
  await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
)
await page.keyboard.press("Escape")
// Fresh context: a first-load network failure must be recoverable without a reload.
const fresh = await browser.newContext({ ignoreHTTPSErrors: true })
const retry = await fresh.newPage()
await retry.route("**/led/01.bin", (r) =>
  r.fulfill({ status: 503, body: "retry" }),
)
await retry.goto(process.env.PREVIEW_URL || "http://localhost:3000/", {
  waitUntil: "networkidle",
})
await retry.getByRole("button", { name: "查看旭日东升", exact: true }).click()
await retry.getByRole("button", { name: "重试加载", exact: true }).waitFor()
await retry.unroute("**/led/01.bin")
await retry.getByRole("button", { name: "重试加载", exact: true }).click()
await retry.waitForFunction(
  () =>
    Number(document.querySelector('input[aria-label="LED 回放进度"]')?.value) >
    0.3,
)
assert.deepEqual(errors, [])
console.log(
  "PASS: 7 bin autoplay, pause, coordinate sliders/drag/apply/reset, CIE image, mobile width, failed-load retry",
)
await browser.close()
