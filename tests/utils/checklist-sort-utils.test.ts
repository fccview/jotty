import { describe, it, expect } from "vitest"
import {
  numberTree,
  preorderIds,
  restoreTree,
  sameOrder,
  shuffle,
  sortLocale,
  sortTree,
  treeShape,
} from "@/app/_utils/checklist-sort-utils"
import { ItemSort, SortDirection } from "@/app/_types/enums"
import { Item } from "@/app/_types"

const row = (id: string, text: string, children?: Item[]): Item => ({
  id,
  text,
  completed: false,
  order: 0,
  ...(children && { children }),
})

const texts = (items: Item[]) => items.map((item) => item.text)

const ids = (items: Item[]): string[] => items.flatMap((item) => [item.id, ...ids(item.children || [])])

const groceries = () => [
  row("a", "Item 10"),
  row("b", "banana", [row("b1", "zest"), row("b2", "apple")]),
  row("c", "Item 2"),
  row("d", "Apple"),
]

describe("sortTree", () => {
  it("sorts A to Z, numbers by value and ignoring case", () => {
    expect(texts(sortTree(groceries(), ItemSort.ALPHABETICAL, SortDirection.ASC))).toEqual([
      "Apple",
      "banana",
      "Item 2",
      "Item 10",
    ])
  })

  it("sorts Z to A", () => {
    expect(texts(sortTree(groceries(), ItemSort.ALPHABETICAL, SortDirection.DESC))).toEqual([
      "Item 10",
      "Item 2",
      "banana",
      "Apple",
    ])
  })

  it("sorts sub-items inside their own parent", () => {
    const banana = sortTree(groceries(), ItemSort.ALPHABETICAL).find((item) => item.id === "b")
    expect(texts(banana?.children || [])).toEqual(["apple", "zest"])
  })

  it("renumbers order in every group so the writer keeps the new order", () => {
    const sorted = sortTree(groceries(), ItemSort.ALPHABETICAL)
    expect(sorted.map((item) => item.order)).toEqual([0, 1, 2, 3])
    expect(sorted[1].children?.map((item) => item.order)).toEqual([0, 1])
  })

  it("leaves the input untouched", () => {
    const input = groceries()
    sortTree(input, ItemSort.ALPHABETICAL)
    expect(texts(input)).toEqual(["Item 10", "banana", "Item 2", "Apple"])
    expect(texts(input[1].children || [])).toEqual(["zest", "apple"])
  })

  it("shuffles into a new order with the same items and parents", () => {
    for (let attempt = 0; attempt < 20; attempt++) {
      const input = groceries()
      const mixed = sortTree(input, ItemSort.SHUFFLE)
      expect(mixed.map((item) => item.id)).not.toEqual(input.map((item) => item.id))
      expect(ids(mixed).sort()).toEqual(ids(input).sort())
      expect(mixed.find((item) => item.id === "b")?.children?.map((item) => item.id).sort()).toEqual(["b1", "b2"])
    }
  })
})

describe("sortTree by timestamp", () => {
  const stamped = (id: string, createdAt?: string, lastModifiedAt?: string, children?: Item[]): Item => ({
    ...row(id, id, children),
    ...(createdAt && { createdAt }),
    ...(lastModifiedAt && { lastModifiedAt }),
  })

  const chores = () => [
    stamped("b", "2026-02-01T00:00:00.000Z", "2026-02-02T00:00:00.000Z"),
    stamped("a", "2026-01-01T00:00:00.000Z", "2026-03-01T00:00:00.000Z", [
      stamped("a2", "2026-01-03T00:00:00.000Z"),
      stamped("a1", "2026-01-02T00:00:00.000Z"),
    ]),
    stamped("c", "2026-03-01T00:00:00.000Z"),
  ]

  const order = (sort: ItemSort, direction: SortDirection, items = chores()) =>
    sortTree(items, sort, direction).map((item) => item.id)

  it("puts the oldest created first with asc and the newest with desc", () => {
    expect(order(ItemSort.CREATED, SortDirection.ASC)).toEqual(["a", "b", "c"])
    expect(order(ItemSort.CREATED, SortDirection.DESC)).toEqual(["c", "b", "a"])
  })

  it("sorts by last change, using creation for items never modified", () => {
    expect(order(ItemSort.MODIFIED, SortDirection.DESC)).toEqual(["a", "c", "b"])
    expect(order(ItemSort.MODIFIED, SortDirection.ASC)).toEqual(["b", "a", "c"])
  })

  it("sorts sub-items inside their own parent", () => {
    const parent = sortTree(chores(), ItemSort.CREATED, SortDirection.ASC).find((item) => item.id === "a")
    expect(parent?.children?.map((item) => item.id)).toEqual(["a1", "a2"])
  })

  it("keeps items without a timestamp at the end in their original order", () => {
    const items = [stamped("x"), stamped("new", "2026-05-01T00:00:00.000Z"), stamped("y"), stamped("old", "2026-04-01T00:00:00.000Z")]
    expect(order(ItemSort.CREATED, SortDirection.DESC, items)).toEqual(["new", "old", "x", "y"])
    expect(order(ItemSort.CREATED, SortDirection.ASC, items)).toEqual(["old", "new", "x", "y"])
  })

  it("treats an unreadable timestamp like a missing one", () => {
    const items = [stamped("broken", "not a date"), stamped("fine", "2026-04-01T00:00:00.000Z")]
    expect(order(ItemSort.CREATED, SortDirection.ASC, items)).toEqual(["fine", "broken"])
  })
})

describe("shuffle", () => {
  it("never hands back the order it was given", () => {
    for (let attempt = 0; attempt < 50; attempt++) {
      expect(shuffle([1, 2])).toEqual([2, 1])
    }
  })

  it("keeps empty and single lists as they are", () => {
    expect(shuffle([])).toEqual([])
    expect(shuffle(["only"])).toEqual(["only"])
  })
})

describe("sortTree in other languages", () => {
  const sorted = (locale: string, ...words: string[]) =>
    texts(sortTree(words.map((word, index) => row(String(index), word)), ItemSort.ALPHABETICAL, SortDirection.ASC, locale))

  it("follows the alphabet of the locale it is given", () => {
    expect(sorted("pl", "żaba", "zupa")).toEqual(["zupa", "żaba"])
    expect(sorted("es", "año", "anuncio")).toEqual(["anuncio", "año"])
    expect(sorted("tr", "çanta", "cuma")).toEqual(["cuma", "çanta"])
  })

  it("files Chinese by pinyin", () => {
    expect(sorted("zh", "牛奶", "面包", "鸡蛋")).toEqual(["鸡蛋", "面包", "牛奶"])
  })
})

describe("sortLocale", () => {
  it("keeps a locale the runtime can collate", () => {
    expect(sortLocale("pl")).toBe("pl")
  })

  it.each([undefined, "", "klingon", "pirate", "en_GB"])("falls back to English for %j", (locale) => {
    expect(sortLocale(locale)).toBe("en")
  })
})

describe("restoreTree", () => {
  it("puts a sorted list back the way it was, sub-items included", () => {
    const before = groceries()
    const sorted = sortTree(before, ItemSort.ALPHABETICAL, SortDirection.DESC)

    const restored = restoreTree(sorted, preorderIds(before))

    expect(ids(restored)).toEqual(ids(before))
    expect(sameOrder(preorderIds(restored), preorderIds(before))).toBe(true)
    expect(restored.map((item) => item.order)).toEqual([0, 1, 2, 3])
  })

  it("undoes several shuffles one at a time", () => {
    const start = groceries()
    const once = sortTree(start, ItemSort.SHUFFLE)
    const twice = sortTree(once, ItemSort.SHUFFLE)

    const back = restoreTree(twice, preorderIds(once))

    expect(ids(back)).toEqual(ids(once))
    expect(ids(restoreTree(back, preorderIds(start)))).toEqual(ids(start))
  })

  it("keeps ticks and edits made after the sort", () => {
    const before = groceries()
    const sorted = sortTree(before, ItemSort.ALPHABETICAL)
    const edited = sorted.map((item) => (item.id === "c" ? { ...item, text: "Item 3", completed: true } : item))

    const restored = restoreTree(edited, preorderIds(before))

    expect(restored.find((item) => item.id === "c")).toMatchObject({ text: "Item 3", completed: true })
  })

  it("leaves items it has no rank for at the end of their group", () => {
    const sorted = [...sortTree(groceries(), ItemSort.ALPHABETICAL), row("new", "Avocado")]

    expect(restoreTree(sorted, preorderIds(groceries())).map((item) => item.id)).toEqual(["a", "b", "c", "d", "new"])
  })

  it("never moves an item into another parent", () => {
    const before = groceries()
    const restored = restoreTree(before, ["b1", ...preorderIds(before)])

    expect(restored.map((item) => item.id)).toEqual(["a", "b", "c", "d"])
    expect(restored[1].children?.map((item) => item.id)).toEqual(["b1", "b2"])
  })
})

describe("treeShape", () => {
  it("tells a nested item from one sitting next to its old parent", () => {
    const flat = [row("a", "A"), row("b", "B"), row("c", "C")]
    const nested = [row("a", "A", [row("b", "B")]), row("c", "C")]

    expect(sameOrder(preorderIds(flat), preorderIds(nested))).toBe(true)
    expect(sameOrder(treeShape(flat), treeShape(nested))).toBe(false)
    expect(treeShape(nested)).toEqual(["0:a", "1:b", "0:c"])
  })
})

describe("numberTree", () => {
  it("copies the tree and numbers every level without moving anything", () => {
    const start = groceries()
    const numbered = numberTree(start)

    expect(ids(numbered)).toEqual(ids(start))
    expect(numbered.map((item) => item.order)).toEqual([0, 1, 2, 3])
    expect(numbered[1].children?.map((item) => item.order)).toEqual([0, 1])
    expect(numbered[1]).not.toBe(start[1])
    expect(numbered[1].children).not.toBe(start[1].children)
  })
})
