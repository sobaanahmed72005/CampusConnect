/**
 * CampusConnect — Student Personalization Engine
 * Matches events, marketplace listings, and society workshops against student department & interests.
 */

export function getPersonalizedRecommendations(user, events = [], products = []) {
  if (!user) return { events: [], products: [], reason: 'Popular Across Campus' }

  // Load student interests from localStorage or defaults
  let interests = ['Web Development', 'AI / Machine Learning', 'Competitive Programming']
  try {
    const saved = localStorage.getItem(`cc_skills_${user.id}`)
    if (saved) interests = JSON.parse(saved)
  } catch {}

  const dept = user.department || 'Computer Science'
  const primaryInterest = interests[0] || 'Technology'

  // Match Events
  const scoredEvents = events.map(e => {
    let score = 0
    let matchReason = `Recommended for ${dept}`

    const text = (e.title + ' ' + (e.description || '') + ' ' + (e.category || '')).toLowerCase()

    interests.forEach(interest => {
      if (text.includes(interest.toLowerCase())) {
        score += 40
        matchReason = `Because you're interested in ${interest}`
      }
    })

    if (e.category && (e.category.toLowerCase().includes('tech') || e.category.toLowerCase().includes('workshop'))) {
      score += 20
    }

    return { ...e, score, matchReason }
  }).sort((a, b) => b.score - a.score)

  // Match Marketplace Products
  const scoredProducts = products.map(p => {
    let score = 0
    let matchReason = `Trending in ${dept}`

    const text = (p.title + ' ' + (p.description || '') + ' ' + (p.category || '')).toLowerCase()

    interests.forEach(interest => {
      if (text.includes(interest.toLowerCase())) {
        score += 40
        matchReason = `Matches your interest in ${interest}`
      }
    })

    if (p.category === 'Books & Stationery' || p.category === 'Notes' || p.category === 'Electronics') {
      score += 20
    }

    return { ...p, score, matchReason }
  }).sort((a, b) => b.score - a.score)

  return {
    events: scoredEvents.slice(0, 3),
    products: scoredProducts.slice(0, 3),
    primaryInterest,
    dept
  }
}
