require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const { pool } = require('../config/database')
const bcrypt = require('bcryptjs')

const seed = async () => {
  const client = await pool.connect()
  try {
    console.log('🌱 Seeding CampusConnect database with demo accounts...')

    // Admin user
    const adminHash = await bcrypt.hash('admin123', 12)
    const adminResult = await client.query(
      `INSERT INTO users (first_name, last_name, email, password, student_id, department, role)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (email) DO UPDATE SET password=$3, role=$7
       RETURNING id, email`,
      ['Admin', 'User', 'admin@campus.edu', adminHash, 'DEMO_ADMIN001', 'Administration', 'admin']
    )
    console.log('✅ Admin user ready:', adminResult.rows[0].email)

    // Student user
    const studentHash = await bcrypt.hash('password123', 12)
    const studentResult = await client.query(
      `INSERT INTO users (first_name, last_name, email, password, student_id, department, year_of_study)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (email) DO UPDATE SET password=$3
       RETURNING id, email`,
      ['Alex', 'Johnson', 'student@campus.edu', studentHash, 'DEMO_2021CS001', 'Computer Science', 3]
    )
    console.log('✅ Student user ready:', studentResult.rows[0].email)

    console.log('\n🎉 Demo accounts ready!')
    console.log('\n📋 Login Credentials:')
    console.log('   Admin: admin@campus.edu / admin123')
    console.log('   Student: student@campus.edu / password123')
    console.log('\n   Also try existing accounts:')
    console.log('   Admin: admin@campusconnect.edu (check DB for password)')
    console.log('   Student: john.doe@campusconnect.edu (check DB for password)')
  } catch (err) {
    console.error('❌ Seed error:', err.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

seed()
