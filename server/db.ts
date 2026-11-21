import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'ucc_campus.db');
export const db = new Database(dbPath);

// Enable foreign key constraints and WAL mode for reliable concurrent reads
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initializeDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      programme TEXT DEFAULT 'BSc. Computer Science',
      password_hash TEXT,
      role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'moderator')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS places (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      campus_area TEXT NOT NULL,
      location_note TEXT NOT NULL,
      opening_hours TEXT NOT NULL,
      description TEXT NOT NULL,
      image_url TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      place_id INTEGER NOT NULL REFERENCES places(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment TEXT NOT NULL,
      is_flagged INTEGER NOT NULL DEFAULT 0,
      flag_reason TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  seedSampleData();
}

function seedSampleData(): void {
  const categoryCount = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
  if (categoryCount.count > 0) {
    return;
  }

  const insertCategory = db.prepare(
    'INSERT INTO categories (name, slug, description) VALUES (?, ?, ?)'
  );

  const categories = [
    ['Libraries & Study Spots', 'libraries', 'Quiet reading halls, group study rooms, and 24-hour exam prep zones.'],
    ['Lecture Halls', 'lecture-halls', 'Main lecture theatres, seminar rooms, and faculty teaching complexes.'],
    ['Cafeterias & Dining', 'cafeterias', 'Hall canteens, affordable Ghanaian meals, snack bars, and coffee spots.'],
    ['Hostels & Halls', 'hostels', 'Traditional halls of residence, private hostels, and student courtyards.'],
    ['Labs & Tech Hubs', 'labs-tech', 'Computer laboratories, coding club spaces, and campus Wi-Fi zones.'],
    ['Campus Spaces & Recreation', 'recreation', 'Coastal breeze terraces, sports fields, and student gathering grounds.'],
  ];

  const categoryIds: Record<string, number> = {};
  for (const [name, slug, description] of categories) {
    const info = insertCategory.run(name, slug, description);
    categoryIds[slug] = Number(info.lastInsertRowid);
  }

  const insertPlace = db.prepare(`
    INSERT INTO places (name, category_id, campus_area, location_note, opening_hours, description, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const places = [
    [
      'Sam Jonah Library',
      categoryIds['libraries'],
      'New Site',
      'Central Academic Spine, opposite Administration Block',
      'Mon–Sat · 8:00 AM – 10:00 PM',
      'The main university library featuring quiet individual carrels, air-conditioned reading rooms, reliable campus eduroam Wi-Fi, and dedicated postgraduate research floors.',
      '/src/assets/images/ucc_sam_jonah_library_1795264649526.jpg',
    ],
    [
      'Science Lecture Theatre Complex (SLT)',
      categoryIds['lecture-halls'],
      'New Site',
      'School of Physical Sciences, Science Quadrangle',
      'Mon–Fri · 6:30 AM – 8:00 PM',
      'Large tiered lecture halls equipped with projection screens and ceiling fans, widely used for Computer Science, Mathematics, and Natural Science courses.',
      '/src/assets/images/ucc_science_lecture_hall_1795264650493.jpg',
    ],
    [
      'Valco Hall Cafeteria',
      categoryIds['cafeterias'],
      'New Site',
      'Valco Hall Ground Courtyard, near New Site Shuttle Stop',
      'Daily · 6:30 AM – 9:30 PM',
      'Popular student dining spot serving waakye, jollof, banku, and quick breakfast combos between lectures with shaded outdoor seating.',
      '/src/assets/images/ucc_cafeteria_dining_1795264649631.jpg',
    ],
    [
      'Oguaa Hall Courtyard & Gazebo',
      categoryIds['hostels'],
      'Old Site',
      'Oguaa Hall Quadrangle, Old Site Campus',
      'Open 24 Hours (Residents & Guests)',
      'One of UCC’s founding halls known for its calm coastal breeze, tidy paved courtyard, evening group study tables, and close proximity to Old Site lecture rooms.',
      '/src/assets/images/ucc_hostel_courtyard_1795264651276.jpg',
    ],
    [
      'CoDE & AmaliTech Student Tech Hub',
      categoryIds['labs-tech'],
      'New Site',
      'College of Distance Education Annex, 2nd Floor',
      'Mon–Fri · 8:00 AM – 6:00 PM',
      'Collaborative computing space with power outlets at every desk, high-speed fibre internet, and weekly coding club workshops for software engineering practice.',
      '/src/assets/images/ucc_campus_hero_1795264651028.jpg',
    ],
    [
      'New Examination Centre (NEC) Reading Wing',
      categoryIds['libraries'],
      'New Site',
      'East Academic Zone, behind Faculty of Social Sciences',
      'Mon–Sun · 7:00 AM – 11:00 PM',
      'Spacious examination hall that opens for quiet peer-study sessions during mid-semesters and revision week, with bright lighting and strong ventilation.',
      '/src/assets/images/ucc_sam_jonah_library_1795264649526.jpg',
    ],
    [
      'CASFORD Dining & Bush Canteen',
      categoryIds['cafeterias'],
      'New Site',
      'Casely-Hayford Hall Perimeter',
      'Daily · 7:00 AM – 10:00 PM',
      'Lively budget-friendly food court loved for fast local rice dishes, grilled tilapia, and chilled sobolo after afternoon labs.',
      '/src/assets/images/ucc_cafeteria_dining_1795264649631.jpg',
    ],
    [
      'Atlantic Hall Seafront Terrace',
      categoryIds['recreation'],
      'New Site',
      'Atlantic Hall (ATL) South Lawn overlooking the Gulf of Guinea',
      'Daily · 6:00 AM – 10:00 PM',
      'Open-air student gathering terrace with ocean breeze, shaded benches for group discussions, and direct access to weekend sports and hall events.',
      '/src/assets/images/ucc_hostel_courtyard_1795264651276.jpg',
    ],
    [
      'C.A. Ackah Lecture Theatre (CALC)',
      categoryIds['lecture-halls'],
      'Old Site',
      'Faculty of Arts Courtyard, Old Site',
      'Mon–Fri · 7:00 AM – 7:30 PM',
      'Well-known Old Site lecture facility hosting humanities, education, and business tutorials with shaded corridors between classes.',
      '/src/assets/images/ucc_science_lecture_hall_1795264650493.jpg',
    ],
  ];

  const placeIds: number[] = [];
  for (const place of places) {
    const info = insertPlace.run(...place);
    placeIds.push(Number(info.lastInsertRowid));
  }

  // Sample student profiles for realistic seeded campus reviews (non-login display records)
  const insertSeedUser = db.prepare(
    'INSERT INTO users (full_name, email, programme, password_hash, role) VALUES (?, ?, ?, NULL, ?)'
  );
  const studentProfiles = [
    ['Kwame Mensah', 'kwame.mensah@stu.ucc.edu.gh', 'BSc. Computer Science', 'student'],
    ['Ama Serwaa', 'ama.serwaa@stu.ucc.edu.gh', 'BCom. Accounting', 'student'],
    ['Kofi Boateng', 'kofi.boateng@stu.ucc.edu.gh', 'BSc. Information Technology', 'student'],
    ['Efua Darko', 'efua.darko@stu.ucc.edu.gh', 'B.Ed. Mathematics', 'student'],
  ];

  const userIds: number[] = [];
  for (const profile of studentProfiles) {
    const info = insertSeedUser.run(...profile);
    userIds.push(Number(info.lastInsertRowid));
  }

  const insertReview = db.prepare(`
    INSERT INTO reviews (place_id, user_id, rating, comment, is_flagged, flag_reason)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const sampleReviews: Array<[number, number, number, string, number, string | null]> = [
    [placeIds[0], userIds[0], 5, 'Best quiet zone on campus during exam week. The AC on the second floor works well and sockets are easy to find near the window tables.', 0, null],
    [placeIds[0], userIds[1], 5, 'Eduroam Wi-Fi is fast in the morning and the librarians are super helpful when locating past dissertations.', 0, null],
    [placeIds[0], userIds[2], 4, 'Gets packed after 4 PM before quizzes, so arrive early if you want a desk near a power outlet.', 0, null],
    [placeIds[1], userIds[2], 4, 'Clear acoustics in SLT 1 and easy to reach from the shuttle stop. Afternoon classes can feel warm when full.', 0, null],
    [placeIds[1], userIds[3], 4, 'Spacious seating and reliable projectors for early morning math and coding lectures.', 0, null],
    [placeIds[2], userIds[1], 5, 'Quick service between 8 AM and 10 AM lectures. Their waakye and fried plantain portion is great value for students.', 0, null],
    [placeIds[2], userIds[0], 4, 'Clean outdoor tables and affordable prices compared to off-campus spots.', 0, null],
    [placeIds[3], userIds[3], 5, 'Very peaceful in the evenings. The courtyard breeze makes it ideal for reading without needing heavy AC.', 0, null],
    [placeIds[4], userIds[0], 5, 'Our go-to spot for AmaliTech Coding Club meetups! Fast internet, steady power, and plenty of space for pair programming.', 0, null],
    [placeIds[4], userIds[2], 5, 'Great ergonomics and steady Wi-Fi for pushing GitHub repos and testing full-stack projects.', 0, null],
    [placeIds[5], userIds[1], 4, 'Huge space for group revision, though it gets lively near closing time.', 0, null],
    [placeIds[6], userIds[2], 4, 'Always buzzing after afternoon labs. Good variety of Ghanaian dishes and fresh fruit juices.', 0, null],
    [placeIds[7], userIds[3], 5, 'Unbeatable ocean view at sunset. Perfect place to unwind with course mates after a long week.', 0, null],
    [placeIds[8], userIds[1], 3, 'Convenient location at Old Site, though sound carries from the corridor during peak transition hours.', 0, null],
  ];

  for (const review of sampleReviews) {
    insertReview.run(...review);
  }
}
