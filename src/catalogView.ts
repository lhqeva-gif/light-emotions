import { groupKey, type CatalogItem, type GroupDim } from "./catalog"

export interface CatalogFilters {
  band: string
  subBand: string
  family: string
  subFamily: string
  target: string
  led: string
  feedback: string
  query: string
}

export const emptyFilters: CatalogFilters = {
  band: "all",
  subBand: "all",
  family: "all",
  subFamily: "all",
  target: "all",
  led: "all",
  feedback: "all",
  query: "",
}

export function filterCatalog(items: CatalogItem[], filters: CatalogFilters) {
  const query = filters.query.trim().toLocaleLowerCase()
  return items.filter(
    (i) =>
      (filters.band === "all" || i.band === filters.band) &&
      (filters.subBand === "all" || i.subBand === filters.subBand) &&
      (filters.family === "all" || i.effective.family === filters.family) &&
      (filters.subFamily === "all" ||
        i.effective.subFamily === filters.subFamily) &&
      (filters.target === "all" || i.effective.target === filters.target) &&
      (filters.led === "all" ||
        (filters.led === "linked" ? !!i.led : !i.led)) &&
      (filters.feedback === "all" ||
        (filters.feedback === "done" ? i.stats.n > 0 : i.stats.n === 0)) &&
      (!query ||
        [
          i.name,
          i.id,
          i.subBandLabel,
          i.effective.family,
          i.effective.subFamily,
          i.effective.target,
          ...(i.design?.keywords ?? i.led?.keywords ?? []),
        ]
          .join(" ")
          .toLocaleLowerCase()
          .includes(query)),
  )
}

export function countGroups(items: CatalogItem[], dim: GroupDim) {
  return items.reduce<Record<string, number>>((counts, i) => {
    const key = groupKey(i, dim)
    counts[key] = (counts[key] ?? 0) + 1
    return counts
  }, {})
}

/** 测评队列在打开时快照，不随“待反馈”筛选实时移除而跳项。 */
export function nextSceneId(
  queue: string[],
  current: string,
  direction: -1 | 1,
) {
  const index = queue.indexOf(current)
  return queue.length
    ? queue[(Math.max(index, 0) + direction + queue.length) % queue.length]
    : null
}
