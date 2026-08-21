// Test Data Factory Generators
// Constructs isolated mock models for users, marketplace items, events, and lost/found reports

const crypto = require('crypto')

function createStudentUser(overrides = {}) {
  const id = overrides.id || crypto.randomUUID()
  return {
    id,
    email: overrides.email || `student_${id.substring(0, 8)}@nu.edu.pk`,
    password_hash: '$2b$10$w8.mP9Z4Z8gJ9Z4Z8gJ9Z4Z8gJ9Z4Z8gJ9Z4Z8gJ9Z4Z8gJ9Z4Z8g',
    first_name: overrides.first_name || 'Ali',
    last_name: overrides.last_name || 'Khan',
    role: overrides.role || 'student',
    is_active: overrides.is_active !== undefined ? overrides.is_active : true,
    session_version: overrides.session_version || 1,
    created_at: new Date()
  }
}

function createAdminUser(overrides = {}) {
  return createStudentUser({
    role: 'admin',
    email: `admin_${crypto.randomUUID().substring(0, 8)}@nu.edu.pk`,
    ...overrides
  })
}

function createMarketplaceItem(sellerId, overrides = {}) {
  return {
    id: overrides.id || crypto.randomUUID(),
    seller_id: sellerId,
    title: overrides.title || 'Data Structures Textbook',
    description: overrides.description || 'Clean condition C++ textbook',
    price: overrides.price !== undefined ? overrides.price : 1200.00,
    category: overrides.category || 'Books',
    is_sold: overrides.is_sold !== undefined ? overrides.is_sold : false,
    created_at: new Date()
  }
}

function createCampusEvent(overrides = {}) {
  return {
    id: overrides.id || crypto.randomUUID(),
    title: overrides.title || 'FAST Hackathon 2026',
    description: overrides.description || 'Annual software development hackathon',
    category: overrides.category || 'Technology',
    event_date: overrides.event_date || new Date(Date.now() + 86400000),
    capacity: overrides.capacity !== undefined ? overrides.capacity : 50,
    created_at: new Date()
  }
}

function createLostFoundItem(reporterId, overrides = {}) {
  return {
    id: overrides.id || crypto.randomUUID(),
    reporter_id: reporterId,
    item_type: overrides.item_type || 'lost',
    title: overrides.title || 'Blue HP Laptop Charger',
    category: overrides.category || 'Electronics',
    location: overrides.location || 'Library 2nd Floor',
    incident_date: overrides.incident_date || '2026-08-20',
    description: overrides.description || 'Original 65W HP blue tip charger',
    status: overrides.status || 'open',
    created_at: new Date()
  }
}

module.exports = {
  createStudentUser,
  createAdminUser,
  createMarketplaceItem,
  createCampusEvent,
  createLostFoundItem
}
