const EVENTS_TABLE = process.env.SUPABASE_EVENTS_TABLE || 'events';

const SUPABASE_URL = String(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
const SUPABASE_SERVICE_ROLE_KEY = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

function isSupabaseEnabled() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

function ensureMemoryDb() {
  if (!globalThis.__hpMemoryDb) {
    globalThis.__hpMemoryDb = { applications: [], members: [], invites: [], events: [] };
  }
  if (!globalThis.__hpMemoryDb.events) {
    globalThis.__hpMemoryDb.events = [];
  }
  return globalThis.__hpMemoryDb;
}

async function supabaseRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Supabase request failed (${response.status}): ${payload}`);
  }

  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Log an event - fire and forget, never throws
// ---------------------------------------------------------------------------

/**
 * @param {string}  type   - Event type, e.g. 'email.sent', 'invite.created'
 * @param {object}  [opts]
 * @param {string}  [opts.actor]  - Who triggered it (email or 'admin' or 'system')
 * @param {string}  [opts.target] - Who it affects (email address)
 * @param {object}  [opts.data]   - Arbitrary metadata (JSON-safe)
 */
async function logEvent(type, { actor, target, data } = {}) {
  const row = {
    type,
    actor: actor || null,
    target: target || null,
    data: data ? JSON.stringify(data) : null,
    createdAt: new Date().toISOString(),
  };

  try {
    if (!isSupabaseEnabled()) {
      const db = ensureMemoryDb();
      db.events.push({ id: Date.now(), ...row, data: data || null });
      return;
    }

    const base = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${encodeURIComponent(EVENTS_TABLE)}`;
    await supabaseRequest(base, {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(row),
    });
  } catch (err) {
    console.error('[events] failed to log event', type, err.message);
  }
}

// ---------------------------------------------------------------------------
// Query events (for admin dashboard)
// ---------------------------------------------------------------------------

async function listEvents({ limit = 100, offset = 0, type, actor, target } = {}) {
  if (!isSupabaseEnabled()) {
    let all = ensureMemoryDb().events.slice().reverse();
    if (type) all = all.filter((e) => e.type === type || e.type.startsWith(type + '.'));
    if (actor) all = all.filter((e) => e.actor === actor);
    if (target) all = all.filter((e) => e.target === target);
    return all.slice(offset, offset + limit);
  }

  const params = new URLSearchParams({
    select: '*',
    order: 'createdAt.desc.nullslast',
    limit: String(limit),
    offset: String(offset),
  });

  if (type) {
    // Support prefix matching: 'email' matches 'email.sent', 'email.failed'
    if (type.includes('.')) {
      params.append('type', `eq.${type}`);
    } else {
      params.append('type', `like.${type}.%`);
    }
  }
  if (actor) params.append('actor', `eq.${actor}`);
  if (target) params.append('target', `eq.${target}`);

  const base = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${encodeURIComponent(EVENTS_TABLE)}`;
  const data = await supabaseRequest(`${base}?${params.toString()}`);
  return (Array.isArray(data) ? data : []).map((row) => {
    if (typeof row.data === 'string') {
      try { row.data = JSON.parse(row.data); } catch { /* keep as-is */ }
    }
    return row;
  });
}

export { logEvent, listEvents };
