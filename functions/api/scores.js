// Cloudflare Pages Function: break room arcade leaderboard.
//
// GET  /api/scores?game=one_shot&limit=10   top scores for one game: [{ player, score, date }]
// GET  /api/scores?health=1                 setup check (binding, table, row counts). No player data.
// POST /api/scores  { game, player, score }  saves one score
//
// Scores live in the D1 database bound to this Pages project as TW_SCORES.
// The table creates itself on first use, and the scores carried over from the old
// Supabase leaderboard (lib/legacy-scores.js) are copied in once, so setup is only:
// create a D1 database and bind it to the Pages project as TW_SCORES.

import LEGACY_SCORES from '../../lib/legacy-scores.js';

const GAMES = new Set(['one_shot', 'going_viral', 'content_defense']);
const MAX_SCORE = 9999999;
// Same characters the break room name prompt allows.
const NAME_OK = /^[A-Z0-9 ._\-'&]+$/;
// Per visitor (hashed IP), so one person can't flood the board.
const POSTS_PER_10_MIN = 30;

// D1's exec() reads one statement per line, so each statement runs on its own through batch().
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game TEXT NOT NULL,
    player TEXT NOT NULL,
    score INTEGER NOT NULL CHECK (score >= 0),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    source TEXT NOT NULL DEFAULT 'd1',
    legacy_id TEXT UNIQUE,
    visitor_hash TEXT,
    country TEXT
  )`,
  'CREATE INDEX IF NOT EXISTS scores_game_score ON scores(game, score DESC)',
  'CREATE INDEX IF NOT EXISTS scores_visitor_time ON scores(visitor_hash, created_at)',
];

// Runs once per worker instance, not on every request.
let ready = null;
function ensureReady(db) {
  ready ??= (async () => {
    await db.batch(SCHEMA.map((sql) => db.prepare(sql)));
    await importLegacy(db);
  })().catch((error) => {
    ready = null; // try again next request
    throw error;
  });
  return ready;
}

// Copies the old Supabase scores in. INSERT OR IGNORE on legacy_id makes it safe to run again.
async function importLegacy(db) {
  if (!LEGACY_SCORES.length) return;
  const have = await db.prepare("SELECT COUNT(*) AS n FROM scores WHERE source = 'supabase'").first();
  if (Number(have?.n || 0) >= LEGACY_SCORES.length) return;
  const insert = db.prepare(
    "INSERT OR IGNORE INTO scores (game, player, score, created_at, source, legacy_id) VALUES (?1, ?2, ?3, ?4, 'supabase', ?5)",
  );
  for (let i = 0; i < LEGACY_SCORES.length; i += 50) {
    await db.batch(
      LEGACY_SCORES.slice(i, i + 50).map((r) =>
        insert.bind(r.game, r.player, r.score, r.created_at, String(r.id)),
      ),
    );
  }
}

const HEADERS = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' };
const json = (data, status = 200) => Response.json(data, { status, headers: HEADERS });

const cleanName = (value) =>
  String(value ?? '').replace(/\s+/g, ' ').trim().toUpperCase().slice(0, 12);

async function visitorHash(request) {
  const ip = request.headers.get('CF-Connecting-IP') || '';
  if (!ip) return null;
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`tw-arcade:${ip}`));
  return [...new Uint8Array(bytes)].slice(0, 16).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const db = env.TW_SCORES;

  if (url.searchParams.get('health') === '1') {
    if (!db) return json({ ok: false, binding: 'TW_SCORES', error: 'binding missing' }, 503);
    try {
      await ensureReady(db);
      const { results } = await db
        .prepare('SELECT game, source, COUNT(*) AS rows FROM scores GROUP BY game, source ORDER BY game, source')
        .all();
      return json({ ok: true, binding: 'TW_SCORES', table: 'scores', counts: results });
    } catch (error) {
      return json({ ok: false, binding: 'TW_SCORES', error: String(error?.message || error) }, 500);
    }
  }

  const game = url.searchParams.get('game') || '';
  if (!GAMES.has(game)) return json({ error: 'unknown game' }, 400);
  if (!db) return json({ error: 'leaderboard not configured' }, 503);

  const limit = Math.max(1, Math.min(50, Number(url.searchParams.get('limit')) || 10));
  try {
    await ensureReady(db);
    const { results } = await db
      .prepare(
        'SELECT player, score, created_at AS date FROM scores WHERE game = ?1 ORDER BY score DESC, id ASC LIMIT ?2',
      )
      .bind(game, limit)
      .all();
    return json(results);
  } catch (error) {
    console.error('Could not load scores:', error);
    return json({ error: 'could not load scores' }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  const db = env.TW_SCORES;
  if (!db) return json({ error: 'leaderboard not configured' }, 503);

  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) return json({ error: 'forbidden' }, 403);
  if (Number(request.headers.get('Content-Length') || 0) > 1024) return json({ error: 'too large' }, 413);

  let raw;
  try {
    raw = await request.json();
  } catch {
    return json({ error: 'invalid json' }, 400);
  }

  const game = String(raw?.game || '');
  const player = cleanName(raw?.player) || '???';
  const score = Math.floor(Number(raw?.score));
  if (!GAMES.has(game)) return json({ error: 'unknown game' }, 400);
  if (player !== '???' && !NAME_OK.test(player)) return json({ error: 'invalid name' }, 400);
  if (!Number.isFinite(score) || score < 1 || score > MAX_SCORE) return json({ error: 'invalid score' }, 400);

  try {
    await ensureReady(db);
    const visitor = await visitorHash(request);
    if (visitor) {
      const recent = await db
        .prepare("SELECT COUNT(*) AS n FROM scores WHERE visitor_hash = ?1 AND created_at >= datetime('now', '-10 minutes')")
        .bind(visitor)
        .first();
      if (Number(recent?.n || 0) >= POSTS_PER_10_MIN) return json({ error: 'slow down' }, 429);
    }
    await db
      .prepare('INSERT INTO scores (game, player, score, visitor_hash, country) VALUES (?1, ?2, ?3, ?4, ?5)')
      .bind(game, player, score, visitor, String(request.cf?.country || '').slice(0, 8))
      .run();
    return json({ ok: true }, 201);
  } catch (error) {
    console.error('Could not save score:', error);
    return json({ error: 'could not save score' }, 500);
  }
}
