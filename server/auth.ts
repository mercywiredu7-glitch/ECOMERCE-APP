import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { db } from './db.ts';

// Keep signing secret strictly on the server with a runtime fallback
const SESSION_SECRET =
  process.env.SESSION_SECRET && process.env.SESSION_SECRET.trim().length > 0
    ? process.env.SESSION_SECRET
    : crypto.randomBytes(32).toString('hex');

export interface AuthUser {
  id: number;
  fullName: string;
  email: string;
  programme: string;
  role: 'student' | 'moderator';
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

interface TokenPayload {
  userId?: number;
  role: 'student' | 'moderator';
  exp: number;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, originalHex] = parts;
  if (!salt || !originalHex) return false;

  const derived = crypto.scryptSync(password, salt, 64);
  const original = Buffer.from(originalHex, 'hex');
  if (derived.length !== original.length) return false;
  return crypto.timingSafeEqual(derived, original);
}

export function signToken(payload: Omit<TokenPayload, 'exp'>): string {
  const fullPayload: TokenPayload = {
    ...payload,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
  };
  const encoded = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${signature}`;
}

export function verifyToken(token: string): TokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, signature] = parts;
  if (!encoded || !signature) return null;

  const expectedSignature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encoded)
    .digest('base64url');

  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as TokenPayload;
    if (!parsed.exp || parsed.exp < Date.now()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function parseAuthFromHeader(req: Request): AuthUser | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice('Bearer '.length).trim();
  const payload = verifyToken(token);
  if (!payload) return null;

  if (payload.userId) {
    const row = db
      .prepare('SELECT id, full_name, email, programme, role FROM users WHERE id = ?')
      .get(payload.userId) as
      | { id: number; full_name: string; email: string; programme: string; role: 'student' | 'moderator' }
      | undefined;
    if (!row) return null;
    return {
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      programme: row.programme,
      role: payload.role === 'moderator' ? 'moderator' : row.role,
    };
  }

  // Standalone moderator session verified via moderator passcode
  if (payload.role === 'moderator') {
    return {
      id: 0,
      fullName: 'Campus Moderator',
      email: 'moderator@ucc.edu.gh',
      programme: 'Campus Administration',
      role: 'moderator',
    };
  }

  return null;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const user = parseAuthFromHeader(req);
  if (!user || user.id === 0) {
    res.status(401).json({ error: 'Please sign in with a student account to continue.' });
    return;
  }
  req.user = user;
  next();
}

export function requireModerator(req: AuthRequest, res: Response, next: NextFunction): void {
  const user = parseAuthFromHeader(req);
  if (!user || user.role !== 'moderator') {
    res.status(403).json({ error: 'Moderator verification is required for this action.' });
    return;
  }
  req.user = user;
  next();
}
