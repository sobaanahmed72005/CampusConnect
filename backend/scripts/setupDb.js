require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const { pool } = require('../config/database')

const setup = async () => {
  const client = await pool.connect()
  try {
    console.log('🔧 Setting up CampusConnect database...')

    await client.query(`CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      student_id VARCHAR(50) UNIQUE NOT NULL,
      department VARCHAR(100),
      role VARCHAR(20) DEFAULT 'student' CHECK (role IN ('student','admin')),
      phone VARCHAR(30),
      bio TEXT,
      year INTEGER,
      avatar TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`)
    console.log('✅ users table created')

    await client.query(`CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      category VARCHAR(50),
      date DATE,
      time VARCHAR(20),
      location VARCHAR(255),
      capacity INTEGER DEFAULT 100,
      organizer VARCHAR(255),
      image_url TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`)
    console.log('✅ events table created')

    await client.query(`CREATE TABLE IF NOT EXISTS event_registrations (
      id SERIAL PRIMARY KEY,
      event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      status VARCHAR(20) DEFAULT 'registered' CHECK (status IN ('registered','cancelled')),
      registered_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(event_id, user_id)
    )`)
    console.log('✅ event_registrations table created')

    await client.query(`CREATE TABLE IF NOT EXISTS marketplace_listings (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      price DECIMAL(10,2) NOT NULL,
      original_price DECIMAL(10,2),
      category VARCHAR(100),
      condition VARCHAR(50),
      contact_info VARCHAR(255),
      image_url TEXT,
      seller_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      is_active BOOLEAN DEFAULT true,
      views INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`)
    console.log('✅ marketplace_listings table created')

    await client.query(`CREATE TABLE IF NOT EXISTS lost_found_items (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      category VARCHAR(100),
      location VARCHAR(255),
      date_lost_found DATE,
      contact_info VARCHAR(255),
      type VARCHAR(10) NOT NULL CHECK (type IN ('lost','found')),
      reporter_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      is_resolved BOOLEAN DEFAULT false,
      image_url TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )`)
    console.log('✅ lost_found_items table created')

    await client.query(`CREATE TABLE IF NOT EXISTS hostels (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      location VARCHAR(255),
      price_per_month DECIMAL(10,2),
      total_rooms INTEGER,
      available_rooms INTEGER DEFAULT 0,
      facilities TEXT[] DEFAULT '{}',
      room_types TEXT[] DEFAULT '{}',
      image_url TEXT,
      rating DECIMAL(3,2),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW()
    )`)
    console.log('✅ hostels table created')

    await client.query(`CREATE TABLE IF NOT EXISTS accommodation_bookings (
      id SERIAL PRIMARY KEY,
      hostel_id INTEGER REFERENCES hostels(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      room_type VARCHAR(50),
      message TEXT,
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW()
    )`)
    console.log('✅ accommodation_bookings table created')

    await client.query(`CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      message TEXT,
      type VARCHAR(50) DEFAULT 'system',
      is_read BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    )`)
    console.log('✅ notifications table created')

    // Indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_events_date ON events(date)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_events_category ON events(category)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_marketplace_seller ON marketplace_listings(seller_id)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_marketplace_category ON marketplace_listings(category)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_lostfound_type ON lost_found_items(type)`)
    console.log('✅ Indexes created')

    console.log('\n🎉 Database setup complete!')
  } catch (err) {
    console.error('❌ Setup error:', err)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

setup()
