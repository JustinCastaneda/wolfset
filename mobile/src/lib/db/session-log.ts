import { getDb } from './database';

// The workout diary: what the live session did, moment by moment — every event, every
// tap from the watch with how long it took to arrive, the rest timer's arming and
// ending, the heart-rate stream minute by minute, the forgotten-workout clock, the app
// going to the background and back. Written as it happens (Justin's ask, 2026-09-05: a
// real gym session, read after the fact), kept for the last few sessions, and shared
// from the Developer Menu as plain text. Local like everything else; never blocks the
// workout — a failed write is dropped (session-controller.ts).

export type DiaryEntry = { at: number; kind: string; detail: Record<string, unknown> };

const KEEP_SESSIONS = 10;

export function appendDiary(
  sessionStartedAt: number,
  at: number,
  kind: string,
  detail: Record<string, unknown>,
) {
  getDb().runSync(
    'INSERT INTO session_log (session_started_at, at, kind, detail) VALUES (?, ?, ?, ?)',
    [sessionStartedAt, at, kind, JSON.stringify(detail)],
  );
}

/** Drop all but the newest sessions' diaries. */
export function pruneDiaries(keep = KEEP_SESSIONS) {
  getDb().runSync(
    `DELETE FROM session_log WHERE session_started_at NOT IN (
       SELECT DISTINCT session_started_at FROM session_log ORDER BY session_started_at DESC LIMIT ?
     )`,
    [keep],
  );
}

/** The newest session's diary, or null before any. */
export function loadLatestDiary(): { sessionStartedAt: number; entries: DiaryEntry[] } | null {
  const db = getDb();
  const latest = db.getFirstSync<{ session_started_at: number }>(
    'SELECT MAX(session_started_at) AS session_started_at FROM session_log',
  );
  if (!latest || latest.session_started_at === null) return null;
  const rows = db.getAllSync<{ at: number; kind: string; detail: string }>(
    'SELECT at, kind, detail FROM session_log WHERE session_started_at = ? ORDER BY id',
    [latest.session_started_at],
  );
  return {
    sessionStartedAt: latest.session_started_at,
    entries: rows.map((r) => ({ at: r.at, kind: r.kind, detail: JSON.parse(r.detail) })),
  };
}

/** The diary as text to share: one line per entry, stamped from the session's start
 *  ("+12:34.5"), the detail as key=value pairs. Pure. */
export function formatDiary(sessionStartedAt: number, entries: DiaryEntry[]): string {
  const lines = entries.map((e) =>
    `${stamp(e.at - sessionStartedAt)}  ${e.kind.padEnd(13)} ${pairs(e.detail)}`.trimEnd(),
  );
  const started = new Date(sessionStartedAt);
  return [
    `WOLFSET workout diary — started ${started.toISOString()} (local ${started.toLocaleString()})`,
    `${entries.length} entries; times are from the start`,
    '',
    ...lines,
  ].join('\n');
}

function stamp(ms: number): string {
  const sign = ms < 0 ? '-' : '+';
  const abs = Math.abs(ms);
  const minutes = Math.floor(abs / 60_000);
  const seconds = ((abs % 60_000) / 1000).toFixed(1).padStart(4, '0');
  return `${sign}${String(minutes).padStart(2, '0')}:${seconds}`;
}

function pairs(detail: Record<string, unknown>): string {
  return Object.entries(detail)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${typeof v === 'string' ? v : JSON.stringify(v)}`)
    .join(' ');
}
