const crypto = require('crypto')
const { query } = require('../config/database')

async function recordActivity(userId, eventType, entityType = null, entityId = null, metadata = {}) {
  if (!eventType) return

  // Privacy & Data Minimization Guard: Strip sensitive fields if accidentally included
  const safeMetadata = { ...metadata }
  delete safeMetadata.password
  delete safeMetadata.token
  delete safeMetadata.secret
  delete safeMetadata.content // Never store chat message contents or body text in telemetry

  try {
    const id = crypto.randomUUID()
    await query(
      `INSERT INTO student_activity_telemetry (id, user_id, event_type, entity_type, entity_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, userId || null, eventType, entityType || null, entityId ? String(entityId) : null, JSON.stringify(safeMetadata)]
    )
  } catch (err) {
    // Telemetry errors must never disrupt application execution
    console.error('Telemetry record warning:', err.message)
  }
}

module.exports = { recordActivity }
