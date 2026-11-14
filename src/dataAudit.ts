import { emotionTargets, targetInfo } from "./emotion"
import { subBandMeta, subFamilyMeta, type CatalogItem } from "./catalog"

export interface AuditIssue {
  item: string
  message: string
}

/** 结构与计算一致性校验，不将通过检查等同于心理效应已验证。 */
export function auditCatalog(items: CatalogItem[]) {
  const issues: AuditIssue[] = []
  const ids = new Set<string>()
  for (const i of items) {
    const fail = (message: string) => issues.push({ item: i.name, message })
    if (ids.has(i.id)) fail("素材标识重复")
    ids.add(i.id)
    const t = targetInfo(i.effective.target)
    if (
      !t ||
      t.family !== i.effective.family ||
      t.subFamily !== i.effective.subFamily
    )
      fail("情绪类别与目标关系不一致")
    if (subBandMeta[i.subBand]?.parent !== i.band) fail("基调父子关系不一致")
    if (subFamilyMeta[i.effective.subFamily]?.parent !== i.effective.family)
      fail("类别父子关系不一致")
    for (const v of [i.model.v, i.effective.v]) {
      if (
        ![v.p, v.a, v.d].every((n) => Number.isFinite(n) && n >= -1 && n <= 1)
      )
        fail("PAD 值超出 −1…1 或无效")
    }
    if (
      !Number.isFinite(i.brightness) ||
      i.brightness < 0 ||
      i.brightness > 100
    )
      fail("相对输出 / 明度超出有效范围")
    if (i.flux != null && (!Number.isFinite(i.flux) || i.flux < 0))
      fail("光通量无效")
    if (i.stats.labels.reduce((n, l) => n + l.count, 0) !== i.stats.n)
      fail("反馈条数与标签分布不一致")
    if (!i.stats.n && i.arousal.feedbackAccuracy != null)
      fail("无反馈时不应显示实证一致率")
    if (
      i.effective.secondary.some(
        (s) => s.name === i.effective.target || !targetInfo(s.name),
      )
    )
      fail("次要目标重复或不存在")
  }
  if (new Set(emotionTargets.map((t) => t.name)).size !== emotionTargets.length)
    issues.push({ item: "目标词表", message: "情绪标签重名" })
  return { checked: items.length, issues }
}
