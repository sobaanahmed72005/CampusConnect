require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { pool } = require('../config/database');

async function migrate() {
  const c = await pool.connect();
  try {
    console.log('🔧 Migrating accommodation_listings schema...');

    // Add extra rich housing fields if they don't exist
    await c.query(`ALTER TABLE accommodation_listings ADD COLUMN IF NOT EXISTS gender_preference VARCHAR(50) DEFAULT 'Co-ed'`);
    await c.query(`ALTER TABLE accommodation_listings ADD COLUMN IF NOT EXISTS furnishing_status VARCHAR(50) DEFAULT 'Fully Furnished'`);
    await c.query(`ALTER TABLE accommodation_listings ADD COLUMN IF NOT EXISTS available_from DATE DEFAULT CURRENT_DATE`);

    console.log('✅ Schema migration completed.');

    // Seed rich housing listings with detailed data
    const ownerResult = await c.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
    const ownerId = ownerResult.rows[0]?.id || null;

    const listings = [
      {
        title: 'Sunrise Student Villa — Luxury Dorm Suites',
        description: 'Modern, high-security student residence located just 5 minutes walk from Central Campus Library. Features spacious air-conditioned rooms, high-speed fiber WiFi, 24/7 security with CCTV, common study lounge, and dining hall.',
        type: 'studio',
        price: 450.00,
        price_period: 'month',
        location: 'North Campus — 12 University Drive',
        distance_to_campus: '5 mins walk (400m)',
        images: ['https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800', 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800'],
        facilities: ['WiFi', 'AC', 'Cafeteria', 'Security', 'Laundry', 'Gym', 'Study Lounge'],
        rooms_available: 8,
        total_rooms: 40,
        gender_preference: 'Co-ed',
        furnishing_status: 'Fully Furnished',
        available_from: '2026-09-01',
        contact_info: '+1 (555) 234-5678 • housing@sunrisedorms.com'
      },
      {
        title: 'Green Valley Girls Hostel — Quiet Study Residency',
        description: 'Peaceful, eco-friendly girls hostel with lush garden views, organic dining hall, solar power, and 24/7 female warden security. Perfect for medical and engineering students who prefer a dedicated quiet environment.',
        type: 'shared_room',
        price: 280.00,
        price_period: 'month',
        location: 'East Campus — 88 Garden Lane',
        distance_to_campus: '10 mins walk (800m)',
        images: ['https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800'],
        facilities: ['WiFi', 'Cafeteria', 'Security', 'Laundry', 'Garden', 'Power Backup'],
        rooms_available: 4,
        total_rooms: 25,
        gender_preference: 'Girls Only',
        furnishing_status: 'Fully Furnished',
        available_from: '2026-08-25',
        contact_info: '+1 (555) 876-5432 • warden@greenvalleyhostel.org'
      },
      {
        title: 'Tech Hub Quad Dormitory — Coding & STEM Haven',
        description: 'Designed specifically for CS and Engineering students. High-speed 1Gbps fiber internet, ergonomic study desks, dual monitors in common coding lab, and 24/7 coffee machine.',
        type: 'dorm',
        price: 220.00,
        price_period: 'month',
        location: 'West Campus — 45 Innovation Way',
        distance_to_campus: '2 mins walk (150m)',
        images: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800'],
        facilities: ['WiFi', 'Security', 'Study Lounge', 'Coffee Bar', 'Power Backup'],
        rooms_available: 12,
        total_rooms: 50,
        gender_preference: 'Boys Only',
        furnishing_status: 'Fully Furnished',
        available_from: '2026-09-01',
        contact_info: '+1 (555) 432-1098 • manager@techhubdorm.edu'
      },
      {
        title: 'Highland Student Apartments — Private 2BR',
        description: 'Spacious 2-bedroom furnished apartment with private kitchen, balcony, in-unit washer/dryer, and reserved parking. Ideal for senior students or researchers sharing housing.',
        type: 'apartment',
        price: 750.00,
        price_period: 'month',
        location: 'South Campus — 104 Highland Ave',
        distance_to_campus: '15 mins bus (2.5 km)',
        images: ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800'],
        facilities: ['WiFi', 'AC', 'Parking', 'Balcony', 'Kitchen', 'Laundry'],
        rooms_available: 2,
        total_rooms: 10,
        gender_preference: 'Co-ed',
        furnishing_status: 'Semi-Furnished',
        available_from: '2026-09-15',
        contact_info: '+1 (555) 999-0011 • highland.apartments@studentrentals.com'
      }
    ];

    for (const item of listings) {
      await c.query(`
        INSERT INTO accommodation_listings
        (title, description, type, price, price_period, location, distance_to_campus, images, facilities, rooms_available, total_rooms, gender_preference, furnishing_status, available_from, contact_info, owner_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
        ON CONFLICT DO NOTHING
      `, [
        item.title, item.description, item.type, item.price, item.price_period,
        item.location, item.distance_to_campus, item.images, item.facilities,
        item.rooms_available, item.total_rooms, item.gender_preference,
        item.furnishing_status, item.available_from, item.contact_info, ownerId
      ]);
    }

    console.log('✅ Rich housing listings seeded successfully.');

  } catch (err) {
    console.error('❌ Migration error:', err.message);
  } finally {
    c.release();
    pool.end();
  }
}

migrate();
