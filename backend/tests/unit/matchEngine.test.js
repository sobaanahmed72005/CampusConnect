describe('Unit: Lost & Found Match Score Algorithm Suite', () => {
  function calculateMatchScore(lostItem, foundItem) {
    let score = 0
    if (lostItem.category.toLowerCase() === foundItem.category.toLowerCase()) score += 35
    if (lostItem.location.toLowerCase() === foundItem.location.toLowerCase()) score += 25
    if (lostItem.incident_date === foundItem.incident_date) score += 25

    const lostWords = lostItem.description.toLowerCase().split(/\s+/)
    const foundWords = foundItem.description.toLowerCase().split(/\s+/)
    const commonWords = lostWords.filter(w => w.length > 3 && foundWords.includes(w))
    if (commonWords.length > 0) score += 15

    return Math.min(100, score)
  }

  test('Identical category, location, date, and description yields 100% match confidence score', () => {
    const itemA = { category: 'Electronics', location: 'Library', incident_date: '2026-08-20', description: 'Blue laptop charger HP' }
    const itemB = { category: 'Electronics', location: 'Library', incident_date: '2026-08-20', description: 'Blue laptop charger HP' }

    expect(calculateMatchScore(itemA, itemB)).toBe(100)
  })

  test('Partial match calculates weighted partial score correctly', () => {
    const itemA = { category: 'Electronics', location: 'Library', incident_date: '2026-08-20', description: 'Blue charger' }
    const itemB = { category: 'Electronics', location: 'Cafeteria', incident_date: '2026-08-15', description: 'Red umbrella' }

    // Category (35) + 0 + 0 + 0 = 35
    expect(calculateMatchScore(itemA, itemB)).toBe(35)
  })
})
