import crypto from 'crypto';
import express from 'express';
import { db } from './db.ts';
import {
  hashPassword,
  parseAuthFromHeader,
  requireAuth,
  requireModerator,
  signToken,
  verifyPassword,
  type AuthRequest,
} from './auth.ts';

export const apiRouter = express.Router();

function isValidImageUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('/src/assets/')) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function getEnvModeratorPasscode(): string | null {
  const code = process.env.MODERATOR_PASSCODE;
  return code && code.trim().length > 0 ? code.trim() : null;
}

apiRouter.get('/health', (_req, res) => {
  res.json({ ok: true });
});

// 1. Categories with place counts
apiRouter.get('/categories', (_req, res) => {
  const categories = db
    .prepare(
      `
      SELECT
        c.id,
        c.name,
        c.slug,
        c.description,
        COUNT(p.id) as place_count
      FROM categories c
      LEFT JOIN places p ON p.category_id = c.id
      GROUP BY c.id
      ORDER BY c.id ASC
    `
    )
    .all();

  res.json({ categories });
});

// 2. Places list with category filter, search, and sorting
apiRouter.get('/places', (req, res) => {
  const categorySlug = typeof req.query.category === 'string' ? req.query.category.trim() : '';
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const sort = typeof req.query.sort === 'string' ? req.query.sort.trim() : 'top_rated';

  const conditions: string[] = [];
  const params: Array<string | number> = [];

  if (categorySlug && categorySlug !== 'all') {
    conditions.push('c.slug = ?');
    params.push(categorySlug);
  }

  if (search) {
    conditions.push('(LOWER(p.name) LIKE ? OR LOWER(p.campus_area) LIKE ? OR LOWER(p.location_note) LIKE ?)');
    const pattern = `%${search.toLowerCase()}%`;
    params.push(pattern, pattern, pattern);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  let orderClause = 'ORDER BY avg_rating DESC, review_count DESC, p.name ASC';
  if (sort === 'most_reviewed') {
    orderClause = 'ORDER BY review_count DESC, avg_rating DESC, p.name ASC';
  } else if (sort === 'name') {
    orderClause = 'ORDER BY p.name ASC';
  }

  const places = db
    .prepare(
      `
      SELECT
        p.id,
        p.name,
        p.category_id,
        c.name as category_name,
        c.slug as category_slug,
        p.campus_area,
        p.location_note,
        p.opening_hours,
        p.description,
        p.image_url,
        p.created_at,
        COALESCE(ROUND(AVG(r.rating), 1), 0) as avg_rating,
        COUNT(r.id) as review_count
      FROM places p
      JOIN categories c ON c.id = p.category_id
      LEFT JOIN reviews r ON r.place_id = p.id
      ${whereClause}
      GROUP BY p.id
      ${orderClause}
    `
    )
    .all(...params);

  res.json({ places });
});

// 3. Single place details + reviews + rating breakdown
apiRouter.get('/places/:id', (req, res) => {
  const placeId = Number(req.params.id);
  if (!Number.isInteger(placeId) || placeId <= 0) {
    res.status(400).json({ error: 'Invalid place ID.' });
    return;
  }

  const place = db
    .prepare(
      `
      SELECT
        p.id,
        p.name,
        p.category_id,
        c.name as category_name,
        c.slug as category_slug,
        p.campus_area,
        p.location_note,
        p.opening_hours,
        p.description,
        p.image_url,
        p.created_at,
        COALESCE(ROUND(AVG(r.rating), 1), 0) as avg_rating,
        COUNT(r.id) as review_count
      FROM places p
      JOIN categories c ON c.id = p.category_id
      LEFT JOIN reviews r ON r.place_id = p.id
      WHERE p.id = ?
      GROUP BY p.id
    `
    )
    .get(placeId);

  if (!place) {
    res.status(404).json({ error: 'Campus place not found.' });
    return;
  }

  const reviews = db
    .prepare(
      `
      SELECT
        r.id,
        r.place_id,
        r.user_id,
        u.full_name as author_name,
        u.programme as author_programme,
        r.rating,
        r.comment,
        r.is_flagged,
        r.created_at,
        r.updated_at
      FROM reviews r
      JOIN users u ON u.id = r.user_id
      WHERE r.place_id = ?
      ORDER BY r.created_at DESC, r.id DESC
    `
    )
    .all(placeId);

  const distRows = db
    .prepare(
      `
      SELECT rating, COUNT(*) as count
      FROM reviews
      WHERE place_id = ?
      GROUP BY rating
    `
    )
    .all(placeId) as Array<{ rating: number; count: number }>;

  const ratingBreakdown: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  for (const row of distRows) {
    ratingBreakdown[row.rating] = row.count;
  }

  res.json({ place, reviews, ratingBreakdown });
});

// 4. Student Registration & Login
apiRouter.post('/auth/register', (req, res) => {
  const fullName = typeof req.body.fullName === 'string' ? req.body.fullName.trim() : '';
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const programme =
    typeof req.body.programme === 'string' && req.body.programme.trim()
      ? req.body.programme.trim()
      : 'UCC Undergraduate';
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (fullName.length < 2 || fullName.length > 80) {
    res.status(400).json({ error: 'Please enter your full name (2–80 characters).' });
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: 'Please enter a valid email address.' });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    return;
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    res.status(409).json({ error: 'An account with this email already exists.' });
    return;
  }

  const passwordHash = hashPassword(password);
  const info = db
    .prepare(
      'INSERT INTO users (full_name, email, programme, password_hash, role) VALUES (?, ?, ?, ?, ?)'
    )
    .run(fullName, email, programme, passwordHash, 'student');

  const user = {
    id: Number(info.lastInsertRowid),
    fullName,
    email,
    programme,
    role: 'student' as const,
  };
  const token = signToken({ userId: user.id, role: 'student' });
  res.status(201).json({ user, token });
});

apiRouter.post('/auth/login', (req, res) => {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  const row = db
    .prepare('SELECT id, full_name, email, programme, password_hash, role FROM users WHERE email = ?')
    .get(email) as
    | {
        id: number;
        full_name: string;
        email: string;
        programme: string;
        password_hash: string | null;
        role: 'student' | 'moderator';
      }
    | undefined;

  if (!row || !row.password_hash || !verifyPassword(password, row.password_hash)) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  const user = {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    programme: row.programme,
    role: row.role,
  };
  const token = signToken({ userId: user.id, role: user.role });
  res.json({ user, token });
});

apiRouter.get('/auth/me', (req, res) => {
  const user = parseAuthFromHeader(req);
  if (!user) {
    res.status(401).json({ error: 'Not authenticated.' });
    return;
  }
  res.json({ user });
});

// 5. Reviews: Create, Edit, Delete, Flag
apiRouter.post('/places/:id/reviews', requireAuth, (req: AuthRequest, res) => {
  const placeId = Number(req.params.id);
  const rating = Number(req.body.rating);
  const comment = typeof req.body.comment === 'string' ? req.body.comment.trim() : '';

  if (!Number.isInteger(placeId) || placeId <= 0) {
    res.status(400).json({ error: 'Invalid place ID.' });
    return;
  }
  const placeExists = db.prepare('SELECT id FROM places WHERE id = ?').get(placeId);
  if (!placeExists) {
    res.status(404).json({ error: 'Campus place not found.' });
    return;
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    res.status(400).json({ error: 'Please select a star rating from 1 to 5.' });
    return;
  }
  if (comment.length < 5 || comment.length > 1000) {
    res.status(400).json({ error: 'Review comment must be between 5 and 1000 characters.' });
    return;
  }

  const info = db
    .prepare('INSERT INTO reviews (place_id, user_id, rating, comment) VALUES (?, ?, ?, ?)')
    .run(placeId, req.user!.id, rating, comment);

  const created = db
    .prepare(
      `
      SELECT
        r.id,
        r.place_id,
        r.user_id,
        u.full_name as author_name,
        u.programme as author_programme,
        r.rating,
        r.comment,
        r.is_flagged,
        r.created_at,
        r.updated_at
      FROM reviews r
      JOIN users u ON u.id = r.user_id
      WHERE r.id = ?
    `
    )
    .get(Number(info.lastInsertRowid));

  res.status(201).json({ review: created });
});

apiRouter.put('/reviews/:id', requireAuth, (req: AuthRequest, res) => {
  const reviewId = Number(req.params.id);
  const rating = Number(req.body.rating);
  const comment = typeof req.body.comment === 'string' ? req.body.comment.trim() : '';

  if (!Number.isInteger(reviewId) || reviewId <= 0) {
    res.status(400).json({ error: 'Invalid review ID.' });
    return;
  }

  const existing = db
    .prepare('SELECT id, user_id FROM reviews WHERE id = ?')
    .get(reviewId) as { id: number; user_id: number } | undefined;

  if (!existing) {
    res.status(404).json({ error: 'Review not found.' });
    return;
  }
  if (existing.user_id !== req.user!.id) {
    res.status(403).json({ error: 'You can only edit your own reviews.' });
    return;
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    res.status(400).json({ error: 'Please select a star rating from 1 to 5.' });
    return;
  }
  if (comment.length < 5 || comment.length > 1000) {
    res.status(400).json({ error: 'Review comment must be between 5 and 1000 characters.' });
    return;
  }

  db.prepare("UPDATE reviews SET rating = ?, comment = ?, updated_at = datetime('now') WHERE id = ?").run(
    rating,
    comment,
    reviewId
  );

  const updated = db
    .prepare(
      `
      SELECT
        r.id,
        r.place_id,
        r.user_id,
        u.full_name as author_name,
        u.programme as author_programme,
        r.rating,
        r.comment,
        r.is_flagged,
        r.created_at,
        r.updated_at
      FROM reviews r
      JOIN users u ON u.id = r.user_id
      WHERE r.id = ?
    `
    )
    .get(reviewId);

  res.json({ review: updated });
});

apiRouter.delete('/reviews/:id', requireAuth, (req: AuthRequest, res) => {
  const reviewId = Number(req.params.id);
  if (!Number.isInteger(reviewId) || reviewId <= 0) {
    res.status(400).json({ error: 'Invalid review ID.' });
    return;
  }

  const existing = db
    .prepare('SELECT id, user_id FROM reviews WHERE id = ?')
    .get(reviewId) as { id: number; user_id: number } | undefined;

  if (!existing) {
    res.status(404).json({ error: 'Review not found.' });
    return;
  }
  if (existing.user_id !== req.user!.id) {
    res.status(403).json({ error: 'You can only delete your own reviews.' });
    return;
  }

  db.prepare('DELETE FROM reviews WHERE id = ?').run(reviewId);
  res.json({ deleted: true });
});

apiRouter.post('/reviews/:id/flag', requireAuth, (req: AuthRequest, res) => {
  const reviewId = Number(req.params.id);
  const reason =
    typeof req.body.reason === 'string' && req.body.reason.trim()
      ? req.body.reason.trim().slice(0, 200)
      : 'Flagged by student for moderator check';

  if (!Number.isInteger(reviewId) || reviewId <= 0) {
    res.status(400).json({ error: 'Invalid review ID.' });
    return;
  }

  const existing = db.prepare('SELECT id FROM reviews WHERE id = ?').get(reviewId);
  if (!existing) {
    res.status(404).json({ error: 'Review not found.' });
    return;
  }

  db.prepare('UPDATE reviews SET is_flagged = 1, flag_reason = ? WHERE id = ?').run(reason, reviewId);
  res.json({ flagged: true });
});

// 6. Moderator setup, verification, and management endpoints
apiRouter.get('/moderator/status', (req, res) => {
  const envPasscode = getEnvModeratorPasscode();
  const savedHash = db
    .prepare("SELECT value FROM app_settings WHERE key = 'moderator_passcode_hash'")
    .get() as { value: string } | undefined;

  const user = parseAuthFromHeader(req);
  res.json({
    envConfigured: Boolean(envPasscode),
    needsSetup: !envPasscode && !savedHash,
    isModerator: user?.role === 'moderator',
  });
});

apiRouter.post('/moderator/claim', (req, res) => {
  const envPasscode = getEnvModeratorPasscode();
  if (envPasscode) {
    res.status(409).json({
      error: 'A server moderator passcode is already configured. Please verify with that passcode.',
    });
    return;
  }

  const passcode = typeof req.body.passcode === 'string' ? req.body.passcode.trim() : '';
  if (passcode.length < 6) {
    res.status(400).json({ error: 'Choose a moderator passcode of at least 6 characters.' });
    return;
  }

  const passcodeHash = hashPassword(passcode);
  const result = db
    .prepare("INSERT OR IGNORE INTO app_settings (key, value) VALUES ('moderator_passcode_hash', ?)")
    .run(passcodeHash);

  if (result.changes === 0) {
    res.status(409).json({ error: 'Moderator passcode has already been claimed. Please sign in.' });
    return;
  }

  const currentUser = parseAuthFromHeader(req);
  const token = signToken({
    userId: currentUser && currentUser.id > 0 ? currentUser.id : undefined,
    role: 'moderator',
  });
  const moderatorUser = currentUser && currentUser.id > 0
    ? { ...currentUser, role: 'moderator' as const }
    : {
        id: 0,
        fullName: 'Campus Moderator',
        email: 'moderator@ucc.edu.gh',
        programme: 'Campus Administration',
        role: 'moderator' as const,
      };

  res.status(201).json({ user: moderatorUser, token });
});

apiRouter.post('/moderator/verify', (req, res) => {
  const passcode = typeof req.body.passcode === 'string' ? req.body.passcode.trim() : '';
  if (!passcode) {
    res.status(400).json({ error: 'Please enter the moderator passcode.' });
    return;
  }

  const envPasscode = getEnvModeratorPasscode();
  let valid = false;

  if (envPasscode) {
    const a = Buffer.from(passcode);
    const b = Buffer.from(envPasscode);
    valid = a.length === b.length && crypto.timingSafeEqual(a, b);
  } else {
    const savedHash = db
      .prepare("SELECT value FROM app_settings WHERE key = 'moderator_passcode_hash'")
      .get() as { value: string } | undefined;
    if (!savedHash) {
      res.status(400).json({ error: 'Moderator passcode is not configured yet.' });
      return;
    }
    valid = verifyPassword(passcode, savedHash.value);
  }

  if (!valid) {
    res.status(401).json({ error: 'Incorrect moderator passcode.' });
    return;
  }

  const currentUser = parseAuthFromHeader(req);
  const token = signToken({
    userId: currentUser && currentUser.id > 0 ? currentUser.id : undefined,
    role: 'moderator',
  });
  const moderatorUser = currentUser && currentUser.id > 0
    ? { ...currentUser, role: 'moderator' as const }
    : {
        id: 0,
        fullName: 'Campus Moderator',
        email: 'moderator@ucc.edu.gh',
        programme: 'Campus Administration',
        role: 'moderator' as const,
      };

  res.json({ user: moderatorUser, token });
});

apiRouter.get('/moderator/reviews', requireModerator, (_req, res) => {
  const reviews = db
    .prepare(
      `
      SELECT
        r.id,
        r.place_id,
        p.name as place_name,
        r.user_id,
        u.full_name as author_name,
        u.email as author_email,
        r.rating,
        r.comment,
        r.is_flagged,
        r.flag_reason,
        r.created_at
      FROM reviews r
      JOIN places p ON p.id = r.place_id
      JOIN users u ON u.id = r.user_id
      ORDER BY r.is_flagged DESC, r.created_at DESC, r.id DESC
    `
    )
    .all();

  res.json({ reviews });
});

apiRouter.patch('/moderator/reviews/:id/dismiss-flag', requireModerator, (req, res) => {
  const reviewId = Number(req.params.id);
  if (!Number.isInteger(reviewId) || reviewId <= 0) {
    res.status(400).json({ error: 'Invalid review ID.' });
    return;
  }

  const info = db
    .prepare('UPDATE reviews SET is_flagged = 0, flag_reason = NULL WHERE id = ?')
    .run(reviewId);
  if (info.changes === 0) {
    res.status(404).json({ error: 'Review not found.' });
    return;
  }
  res.json({ updated: true });
});

apiRouter.delete('/moderator/reviews/:id', requireModerator, (req, res) => {
  const reviewId = Number(req.params.id);
  if (!Number.isInteger(reviewId) || reviewId <= 0) {
    res.status(400).json({ error: 'Invalid review ID.' });
    return;
  }

  const info = db.prepare('DELETE FROM reviews WHERE id = ?').run(reviewId);
  if (info.changes === 0) {
    res.status(404).json({ error: 'Review not found.' });
    return;
  }
  res.json({ deleted: true });
});

apiRouter.post('/moderator/places', requireModerator, (req, res) => {
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const categoryId = Number(req.body.categoryId);
  const campusArea = typeof req.body.campusArea === 'string' ? req.body.campusArea.trim() : '';
  const locationNote = typeof req.body.locationNote === 'string' ? req.body.locationNote.trim() : '';
  const openingHours = typeof req.body.openingHours === 'string' ? req.body.openingHours.trim() : '';
  const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';
  const imageUrlRaw = typeof req.body.imageUrl === 'string' ? req.body.imageUrl.trim() : '';
  const imageUrl = imageUrlRaw || '/src/assets/images/ucc_campus_hero_1795264651028.jpg';

  if (name.length < 3 || !Number.isInteger(categoryId) || !campusArea || !locationNote || !openingHours || description.length < 10) {
    res.status(400).json({ error: 'Please complete all place fields accurately.' });
    return;
  }
  if (!isValidImageUrl(imageUrl)) {
    res.status(400).json({ error: 'Please provide a valid http(s) or local campus image path.' });
    return;
  }
  const cat = db.prepare('SELECT id FROM categories WHERE id = ?').get(categoryId);
  if (!cat) {
    res.status(400).json({ error: 'Selected category does not exist.' });
    return;
  }

  const info = db
    .prepare(
      `
      INSERT INTO places (name, category_id, campus_area, location_note, opening_hours, description, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
    )
    .run(name, categoryId, campusArea, locationNote, openingHours, description, imageUrl);

  const created = db.prepare('SELECT * FROM places WHERE id = ?').get(Number(info.lastInsertRowid));
  res.status(201).json({ place: created });
});

apiRouter.put('/moderator/places/:id', requireModerator, (req, res) => {
  const placeId = Number(req.params.id);
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const categoryId = Number(req.body.categoryId);
  const campusArea = typeof req.body.campusArea === 'string' ? req.body.campusArea.trim() : '';
  const locationNote = typeof req.body.locationNote === 'string' ? req.body.locationNote.trim() : '';
  const openingHours = typeof req.body.openingHours === 'string' ? req.body.openingHours.trim() : '';
  const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';
  const imageUrlRaw = typeof req.body.imageUrl === 'string' ? req.body.imageUrl.trim() : '';
  const imageUrl = imageUrlRaw || '/src/assets/images/ucc_campus_hero_1795264651028.jpg';

  if (!Number.isInteger(placeId) || placeId <= 0) {
    res.status(400).json({ error: 'Invalid place ID.' });
    return;
  }
  if (name.length < 3 || !Number.isInteger(categoryId) || !campusArea || !locationNote || !openingHours || description.length < 10) {
    res.status(400).json({ error: 'Please complete all place fields accurately.' });
    return;
  }
  if (!isValidImageUrl(imageUrl)) {
    res.status(400).json({ error: 'Please provide a valid http(s) or local campus image path.' });
    return;
  }

  const info = db
    .prepare(
      `
      UPDATE places
      SET name = ?, category_id = ?, campus_area = ?, location_note = ?, opening_hours = ?, description = ?, image_url = ?
      WHERE id = ?
    `
    )
    .run(name, categoryId, campusArea, locationNote, openingHours, description, imageUrl, placeId);

  if (info.changes === 0) {
    res.status(404).json({ error: 'Campus place not found.' });
    return;
  }

  const updated = db.prepare('SELECT * FROM places WHERE id = ?').get(placeId);
  res.json({ place: updated });
});

apiRouter.delete('/moderator/places/:id', requireModerator, (req, res) => {
  const placeId = Number(req.params.id);
  if (!Number.isInteger(placeId) || placeId <= 0) {
    res.status(400).json({ error: 'Invalid place ID.' });
    return;
  }

  const info = db.prepare('DELETE FROM places WHERE id = ?').run(placeId);
  if (info.changes === 0) {
    res.status(404).json({ error: 'Campus place not found.' });
    return;
  }
  res.json({ deleted: true });
});
