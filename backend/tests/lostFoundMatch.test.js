const calculateMatchScore = (lostItem, foundItem) => {
  let score = 0

  // 1. Category Matching (Max 35 Points)
  if (lostItem.category.toLowerCase() === foundItem.category.toLowerCase()) {
    score += 35
  }

  // 2. Location Proximity (Max 25 Points)
  const loc1 = lostItem.location.toLowerCase().trim()
  const loc2 = foundItem.location.toLowerCase().trim()
  if (loc1 === loc2) {
    score += 25
  } else if (loc1.includes(loc2) || loc2.includes(loc1)) {
    score += 18
  }

  // 3. Date Proximity (Max 25 Points)
  const date1 = new Date(lostItem.date_lost_found)
  const date2 = new Date(foundItem.date_lost_found)
  const diffDays = Math.abs(date1 - date2) / (1000 * 60 * 60 * 24)
  if (diffDays <= 1) {
    score += 25
  } else if (diffDays <= 3) {
    score += 15
  } else if (diffDays <= 7) {
    score += 5
  }

  // 4. Keyword / Title Similarity (Max 15 Points)
  const stopWords = new Set(['the', 'a', 'an', 'my', 'lost', 'found', 'in', 'at', 'on', 'with', 'and'])
  const tokenize = (text) => text.toLowerCase().split(/\W+/).filter(w => w.length > 2 && !stopWords.has(w))

  const lostTokens = new Set(tokenize(`${lostItem.title} ${lostItem.description || ''}`))
  const foundTokens = tokenize(`${foundItem.title} ${foundItem.description || ''}`)
  let keywordMatches = 0
  foundTokens.forEach(token => {
    if (lostTokens.has(token)) keywordMatches++
  })

  score += Math.min(15, keywordMatches * 5)

  return Math.min(100, score)
}

describe('Lost & Found Weighted Match Confidence Engine Unit Tests', () => {
  test('Exact Match gives 100% Match Confidence', () => {
    const item1 = {
      category: 'Electronics',
      location: 'CS Lab 3',
      date_lost_found: '2026-08-20',
      title: 'Black HP Laptop Charger',
      description: '65W blue tip AC adapter left near Desk 12'
    }
    const item2 = {
      category: 'Electronics',
      location: 'CS Lab 3',
      date_lost_found: '2026-08-20',
      title: 'Found Black HP Laptop Charger',
      description: 'Found 65W blue tip AC adapter on Desk 12'
    }
    const score = calculateMatchScore(item1, item2)
    expect(score).toBe(100)
  })

  test('Partial Location Substring Match scores 18 pts for Location', () => {
    const item1 = {
      category: 'Books',
      location: 'CS Building',
      date_lost_found: '2026-08-20',
      title: 'Algorithms Textbook',
      description: 'CLRS 3rd Edition'
    }
    const item2 = {
      category: 'Books',
      location: 'CS Building Floor 2',
      date_lost_found: '2026-08-20',
      title: 'Algorithms Textbook',
      description: 'CLRS 3rd Edition'
    }
    const score = calculateMatchScore(item1, item2)
    expect(score).toBe(93)
  })

  test('Date Proximity degrades gracefully across 1, 3, and 7 day thresholds', () => {
    const baseLost = {
      category: 'Accessories',
      location: 'Library',
      title: 'RayBan Glasses',
      date_lost_found: '2026-08-20'
    }

    const itemWithin1Day = { ...baseLost, date_lost_found: '2026-08-21' }
    const itemWithin3Days = { ...baseLost, date_lost_found: '2026-08-23' }
    const itemWithin7Days = { ...baseLost, date_lost_found: '2026-08-26' }
    const itemBeyond7Days = { ...baseLost, date_lost_found: '2026-09-05' }

    // 35 (Cat) + 25 (Loc) + 10 (Keywords: rayban, glasses) = 70 base pts
    expect(calculateMatchScore(baseLost, itemWithin1Day)).toBe(95) // +25 date
    expect(calculateMatchScore(baseLost, itemWithin3Days)).toBe(85)  // +15 date
    expect(calculateMatchScore(baseLost, itemWithin7Days)).toBe(75)  // +5 date
    expect(calculateMatchScore(baseLost, itemBeyond7Days)).toBe(70)  // +0 date
  })

  test('Tokenization ignores stop-words (the, a, my, lost, found)', () => {
    const item1 = {
      category: 'Keys',
      location: 'Cafeteria',
      date_lost_found: '2026-08-20',
      title: 'The my lost keys',
      description: 'a found key'
    }
    const item2 = {
      category: 'Keys',
      location: 'Cafeteria',
      date_lost_found: '2026-08-20',
      title: 'A my found keys',
      description: 'the lost key'
    }
    const score = calculateMatchScore(item1, item2)
    // 35 (Cat) + 25 (Loc) + 25 (Date) + 10 (2 keyword matches: key, keys) = 95
    expect(score).toBe(95)
  })

  test('Score never exceeds 100 points maximum cap', () => {
    const item1 = {
      category: 'Electronics',
      location: 'Library',
      date_lost_found: '2026-08-20',
      title: 'Apple MacBook Pro M2 Silver Laptop Notebook',
      description: 'Silver 14 inch Apple MacBook Pro with sticker'
    }
    const item2 = {
      category: 'Electronics',
      location: 'Library',
      date_lost_found: '2026-08-20',
      title: 'Apple MacBook Pro M2 Silver Laptop Notebook',
      description: 'Silver 14 inch Apple MacBook Pro with sticker'
    }
    const score = calculateMatchScore(item1, item2)
    expect(score).toBe(100)
  })
})
