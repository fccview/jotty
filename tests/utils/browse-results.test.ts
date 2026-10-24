import { describe, it, expect } from 'vitest'
import { browseResults } from '@/app/_utils/browse-utils'
import { BrowseSort } from '@/app/_consts/browse'

const item = (title: string, day: number) => ({
  title,
  updatedAt: new Date(Date.UTC(2026, 0, day)).toISOString(),
})

const items = [item('c', 1), item('a', 2), item('d', 3), item('b', 4)]
const keepAll = () => true
const capTwo = () => 2

describe('browseResults', () => {
  it('caps to the newest items before applying the chosen sort', () => {
    const oldest = browseResults(items, 'recent', BrowseSort.OLDEST, keepAll, capTwo)
    expect(oldest.map((entry) => entry.title)).toEqual(['d', 'b'])

    const alphabetical = browseResults(items, 'recent', BrowseSort.AZ, keepAll, capTwo)
    expect(alphabetical.map((entry) => entry.title)).toEqual(['b', 'd'])
  })

  it('sorts everything when there is no cap', () => {
    const sorted = browseResults(items, 'all', BrowseSort.AZ, keepAll)
    expect(sorted.map((entry) => entry.title)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('does not mutate the input', () => {
    const before = items.map((entry) => entry.title)
    browseResults(items, 'recent', BrowseSort.OLDEST, keepAll, capTwo)
    expect(items.map((entry) => entry.title)).toEqual(before)
  })
})
