const APPLICATIONS_TABLE = process.env.SUPABASE_APPLICATIONS_TABLE || 'applications';
const MEMBERS_TABLE = process.env.SUPABASE_MEMBERS_TABLE || 'members';
const INVITES_TABLE = process.env.SUPABASE_INVITES_TABLE || 'invites';
const GUESTLIST_TABLE = process.env.SUPABASE_GUESTLIST_TABLE || 'guestlist';

const SUPABASE_URL = String(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
const SUPABASE_SERVICE_ROLE_KEY = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

const EVENT_DETAILS = {
  title: 'Hocus Pocus: Episode 01',
  dateLabel: 'Wednesday, March 25, 2026',
  timeLabel: '6:00 PM',
  city: 'Vienna',
  location: 'Ruby Paul Workspace',
  scarcityLabel: 'Invite-only | Limited seats',
};

const ADMIN_PERSONAS = {
  joanna: { name: 'Joanna Bakas', email: 'jb@frontira.io' },
  thomas: { name: 'Thomas Pisar', email: 'tp@frontira.io' },
  stefan: { name: 'Stefan Erschwendner', email: 'se@frontira.io' },
};

function nowIso() {
  return new Date().toISOString();
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function cleanString(value) {
  return String(value || '').trim();
}

function nullable(value) {
  const v = cleanString(value);
  return v || null;
}

function extractNameFromLinkedIn(url) {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    const parts = parsed.pathname.split('/').filter(Boolean);
    const slug = parts.find((_, i) => parts[i - 1] === 'in') || parts[parts.length - 1];
    if (!slug) return null;
    // Remove trailing LinkedIn ID suffix (e.g., "-a1b2c3d4e5")
    const cleaned = slug.replace(/-[a-f0-9]{6,}$/i, '');
    const words = cleaned.split('-').filter(Boolean);
    if (words.length === 0) return null;
    return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  } catch {
    return null;
  }
}

function newToken(prefix) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '')}`;
}

function ensureMemoryDb() {
  if (!globalThis.__hpMemoryDb) {
    globalThis.__hpMemoryDb = {
      applications: [],
      members: [],
      invites: [],
    };
  }
  return globalThis.__hpMemoryDb;
}

function isSupabaseEnabled() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

function isAirtableEnabled() {
  // Backward-compatible export name used by existing handlers.
  return isSupabaseEnabled();
}

function toTablePath(tableName, query) {
  const base = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${encodeURIComponent(tableName)}`;
  if (!query) return base;
  const qs = new URLSearchParams(query);
  return `${base}?${qs.toString()}`;
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

async function supabaseListAll(tableName) {
  const data = await supabaseRequest(
    toTablePath(tableName, {
      select: '*',
      order: 'createdAt.desc.nullslast',
      limit: '1000',
    })
  );
  return Array.isArray(data) ? data : [];
}

async function supabaseCreate(tableName, row) {
  const data = await supabaseRequest(toTablePath(tableName), {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(row),
  });
  return Array.isArray(data) ? data[0] : null;
}

async function supabaseUpdateById(tableName, id, fields) {
  const data = await supabaseRequest(
    toTablePath(tableName, {
      select: '*',
      id: `eq.${id}`,
    }),
    {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(fields),
    }
  );
  return Array.isArray(data) ? data[0] : null;
}

async function supabaseDeleteById(tableName, id) {
  await supabaseRequest(
    toTablePath(tableName, { id: `eq.${id}` }),
    { method: 'DELETE' }
  );
}

async function deleteApplication(id) {
  if (!isSupabaseEnabled()) {
    const db = ensureMemoryDb();
    db.applications = db.applications.filter((a) => String(a.id) !== String(id));
    return true;
  }
  await supabaseDeleteById(APPLICATIONS_TABLE, id);
  return true;
}

async function updateMember(memberId, fields) {
  if (!isSupabaseEnabled()) {
    const db = ensureMemoryDb();
    const index = db.members.findIndex((m) => m.id === memberId);
    if (index === -1) return null;
    db.members[index] = { ...db.members[index], ...fields };
    return db.members[index];
  }
  return supabaseUpdateById(MEMBERS_TABLE, memberId, fields);
}

async function listApplications() {
  if (!isSupabaseEnabled()) {
    return ensureMemoryDb().applications.slice();
  }
  return supabaseListAll(APPLICATIONS_TABLE);
}

async function listMembers() {
  if (!isSupabaseEnabled()) {
    return ensureMemoryDb().members.slice();
  }
  return supabaseListAll(MEMBERS_TABLE);
}

async function listInvites() {
  if (!isSupabaseEnabled()) {
    return ensureMemoryDb().invites.slice();
  }
  return supabaseListAll(INVITES_TABLE);
}

async function createApplication(input) {
  const record = {
    email: normalizeEmail(input.email),
    linkedin: cleanString(input.linkedin),
    status: cleanString(input.status) || 'pending',
    createdAt: nowIso(),
    source: input.source || 'public',
    inviteToken: nullable(input.inviteToken),
    approvedAt: nullable(input.approvedAt),
    rejectedAt: nullable(input.rejectedAt),
    memberId: nullable(input.memberId),
    memberToken: nullable(input.memberToken),
  };

  if (!isSupabaseEnabled()) {
    const db = ensureMemoryDb();
    const created = { id: newToken('app'), ...record };
    db.applications.push(created);
    return created;
  }

  const created = await supabaseCreate(APPLICATIONS_TABLE, record);
  return created;
}

async function createMember(input) {
  const linkedinName = input.linkedin ? extractNameFromLinkedIn(input.linkedin) : null;
  const record = {
    name: cleanString(input.name) || linkedinName || null,
    email: normalizeEmail(input.email),
    linkedin: cleanString(input.linkedin),
    accessToken: input.accessToken || newToken('member'),
    createdAt: nowIso(),
    inviterMemberId: nullable(input.inviterMemberId),
    applicationId: nullable(input.applicationId),
  };

  if (!isSupabaseEnabled()) {
    const db = ensureMemoryDb();
    const created = { id: newToken('mem'), ...record };
    db.members.push(created);
    return created;
  }

  return supabaseCreate(MEMBERS_TABLE, record);
}

async function updateApplication(applicationId, fields) {
  if (!isSupabaseEnabled()) {
    const db = ensureMemoryDb();
    const index = db.applications.findIndex((a) => a.id === applicationId);
    if (index === -1) return null;
    db.applications[index] = { ...db.applications[index], ...fields };
    return db.applications[index];
  }

  return supabaseUpdateById(APPLICATIONS_TABLE, applicationId, fields);
}

async function deleteInvite(id) {
  if (!isSupabaseEnabled()) {
    const db = ensureMemoryDb();
    db.invites = db.invites.filter((a) => String(a.id) !== String(id));
    return true;
  }
  await supabaseDeleteById(INVITES_TABLE, id);
  return true;
}

async function updateInvite(inviteId, fields) {
  if (!isSupabaseEnabled()) {
    const db = ensureMemoryDb();
    const index = db.invites.findIndex((a) => a.id === inviteId);
    if (index === -1) return null;
    db.invites[index] = { ...db.invites[index], ...fields };
    return db.invites[index];
  }

  return supabaseUpdateById(INVITES_TABLE, inviteId, fields);
}

async function approveApplication(applicationId) {
  const applications = await listApplications();
  const app = applications.find((row) => String(row.id) === String(applicationId));
  if (!app) {
    return { error: 'Application not found' };
  }
  if (app.status === 'approved') {
    const members = await listMembers();
    const member = members.find((row) => row.applicationId === app.id);
    return { application: app, member };
  }
  if (app.status !== 'pending') {
    return { error: `Cannot approve application with status: ${app.status}` };
  }

  const member = await createMember({
    email: app.email,
    linkedin: app.linkedin,
    applicationId: app.id,
  });

  const updatedApp = await updateApplication(app.id, {
    status: 'approved',
    approvedAt: nowIso(),
    memberToken: member.accessToken,
    memberId: member.id,
  });

  return { application: updatedApp, member };
}

async function rejectApplication(applicationId) {
  const applications = await listApplications();
  const app = applications.find((row) => String(row.id) === String(applicationId));
  if (!app) {
    return { error: 'Application not found' };
  }
  if (app.status !== 'pending') {
    return { error: `Cannot reject application with status: ${app.status}` };
  }

  const updatedApp = await updateApplication(app.id, {
    status: 'rejected',
    rejectedAt: nowIso(),
  });

  return { application: updatedApp };
}

async function findMemberByToken(memberToken) {
  const token = cleanString(memberToken);
  if (!token) return null;
  const members = await listMembers();
  return members.find((row) => row.accessToken === token) || null;
}

async function createInviteForMember(memberToken, origin, { recipientEmail } = {}) {
  const member = await findMemberByToken(memberToken);
  if (!member) {
    return { error: 'Invalid member token' };
  }

  const invites = await listInvites();
  const createdForMember = invites.filter((row) => row.memberId === member.id);
  const remaining = Math.max(0, 2 - createdForMember.length);

  if (remaining <= 0) {
    return { error: 'Invite limit reached (2/2 used)' };
  }

  const inviteRecord = {
    token: newToken('invite'),
    memberId: member.id,
    createdAt: nowIso(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    usedAt: null,
    claimedByMemberId: null,
    recipientEmail: recipientEmail ? normalizeEmail(recipientEmail) : null,
    method: recipientEmail ? 'email' : 'link',
  };

  let created;
  if (!isSupabaseEnabled()) {
    const db = ensureMemoryDb();
    created = { id: newToken('inv'), ...inviteRecord };
    db.invites.push(created);
  } else {
    created = await supabaseCreate(INVITES_TABLE, inviteRecord);
  }

  const base = String(origin || '').replace(/\/$/, '');
  const inviteUrl = `${base}/inside.html?invite=${encodeURIComponent(created.token)}`;

  return {
    invite: created,
    inviteUrl,
    remainingAfterCreate: remaining - 1,
  };
}

async function createAdminInvite(origin, { recipientEmail, senderPersona }) {
  const persona = ADMIN_PERSONAS[senderPersona];
  if (!persona) return { error: 'Invalid sender persona' };

  const inviteRecord = {
    token: newToken('invite'),
    memberId: null,
    createdAt: nowIso(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    usedAt: null,
    claimedByMemberId: null,
    recipientEmail: normalizeEmail(recipientEmail),
    method: 'admin',
    senderPersona,
  };

  let created;
  if (!isSupabaseEnabled()) {
    const db = ensureMemoryDb();
    created = { id: newToken('inv'), ...inviteRecord };
    db.invites.push(created);
  } else {
    created = await supabaseCreate(INVITES_TABLE, inviteRecord);
  }

  const base = String(origin || '').replace(/\/$/, '');
  const inviteUrl = `${base}/inside.html?invite=${encodeURIComponent(created.token)}`;

  return { invite: created, inviteUrl, persona };
}

async function listAdminInvites() {
  const invites = await listInvites();
  return invites
    .filter((inv) => inv.method === 'admin')
    .map((inv) => {
      let status = 'pending';
      if (inv.usedAt) {
        status = 'claimed';
      } else if (inv.expiresAt && Date.parse(inv.expiresAt) < Date.now()) {
        status = 'expired';
      }
      return {
        id: inv.id,
        token: inv.token,
        recipientEmail: inv.recipientEmail,
        senderPersona: inv.senderPersona,
        senderName: ADMIN_PERSONAS[inv.senderPersona]?.name || inv.senderPersona,
        status,
        createdAt: inv.createdAt,
        expiresAt: inv.expiresAt,
        usedAt: inv.usedAt,
      };
    });
}

async function claimInvite(inviteToken, payload) {
  const token = cleanString(inviteToken);
  const email = normalizeEmail(payload.email);
  const linkedin = cleanString(payload.linkedin);

  if (!token) return { error: 'Invite token is required' };
  if (!email) return { error: 'Email is required' };
  if (!linkedin) return { error: 'LinkedIn is required' };

  const invites = await listInvites();
  const invite = invites.find((row) => row.token === token);

  if (!invite) return { error: 'Invite not found' };
  if (invite.usedAt) return { error: 'Invite has already been used' };

  const expiresAtMs = Date.parse(invite.expiresAt);
  if (!Number.isNaN(expiresAtMs) && expiresAtMs < Date.now()) {
    return { error: 'Invite expired (48h window)' };
  }

  const member = await createMember({
    email,
    linkedin,
    inviterMemberId: invite.memberId,
  });

  await updateInvite(invite.id, {
    usedAt: nowIso(),
    claimedByMemberId: member.id,
  });

  await createApplication({
    email,
    linkedin,
    source: 'invite',
    inviteToken: token,
    status: 'approved',
    approvedAt: nowIso(),
    memberId: member.id,
    memberToken: member.accessToken,
  });

  // Return inviter info for notification email
  let inviter = null;
  let inviterRemaining = 0;
  const senderPersona = invite.senderPersona || null;

  if (invite.memberId) {
    const members = await listMembers();
    inviter = members.find((m) => m.id === invite.memberId) || null;
    const allInvites = await listInvites();
    const inviterInvites = inviter ? allInvites.filter((i) => i.memberId === inviter.id) : [];
    inviterRemaining = inviter ? Math.max(0, 2 - inviterInvites.length) : 0;
  }

  return { member, inviter, inviterRemaining, senderPersona, inviteId: invite.id };
}

async function getInviteStats(memberToken) {
  const member = await findMemberByToken(memberToken);
  if (!member) {
    return { error: 'Invalid member token' };
  }

  const invites = await listInvites();
  const mine = invites.filter((row) => row.memberId === member.id);
  const remaining = Math.max(0, 2 - mine.length);

  const history = mine.map((inv) => {
    let status = 'pending';
    if (inv.usedAt) {
      status = 'claimed';
    } else if (inv.expiresAt && Date.parse(inv.expiresAt) < Date.now()) {
      status = 'expired';
    }
    return {
      method: inv.method || (inv.recipientEmail ? 'email' : 'link'),
      recipientEmail: inv.recipientEmail || null,
      status,
      createdAt: inv.createdAt,
      expiresAt: inv.expiresAt,
    };
  });

  return {
    member,
    remaining,
    totalGenerated: mine.length,
    history,
  };
}

// ── Guest List ─────────────────────────────────────────────

async function listGuestlist() {
  if (!isSupabaseEnabled()) {
    return (ensureMemoryDb().guestlist || []).slice();
  }
  return supabaseListAll(GUESTLIST_TABLE);
}

async function addToGuestlist({ email, linkedin, senderPersona }) {
  const record = {
    email: normalizeEmail(email),
    linkedin: cleanString(linkedin),
    senderPersona: cleanString(senderPersona) || 'joanna',
    status: 'draft',
    createdAt: nowIso(),
    sentAt: null,
    inviteId: null,
  };

  if (!isSupabaseEnabled()) {
    const db = ensureMemoryDb();
    if (!db.guestlist) db.guestlist = [];
    const created = { id: newToken('gl'), ...record };
    db.guestlist.push(created);
    return created;
  }

  return supabaseCreate(GUESTLIST_TABLE, record);
}

async function updateGuestlistEntry(id, fields) {
  if (!isSupabaseEnabled()) {
    const db = ensureMemoryDb();
    if (!db.guestlist) db.guestlist = [];
    const index = db.guestlist.findIndex((g) => String(g.id) === String(id));
    if (index === -1) return null;
    db.guestlist[index] = { ...db.guestlist[index], ...fields };
    return db.guestlist[index];
  }
  return supabaseUpdateById(GUESTLIST_TABLE, id, fields);
}

async function deleteFromGuestlist(id) {
  if (!isSupabaseEnabled()) {
    const db = ensureMemoryDb();
    if (!db.guestlist) db.guestlist = [];
    db.guestlist = db.guestlist.filter((g) => String(g.id) !== String(id));
    return true;
  }
  await supabaseDeleteById(GUESTLIST_TABLE, id);
  return true;
}

async function findGuestlistByInviteId(inviteId) {
  const list = await listGuestlist();
  return list.find((g) => String(g.inviteId) === String(inviteId)) || null;
}

async function getInviteInfo(inviteToken) {
  const token = cleanString(inviteToken);
  if (!token) return null;
  const invites = await listInvites();
  const invite = invites.find((row) => row.token === token);
  if (!invite) return null;

  const info = { recipientEmail: invite.recipientEmail || null, linkedin: null };

  // Try to get linkedin from the guestlist entry
  const entry = await findGuestlistByInviteId(invite.id).catch(() => null);
  if (entry?.linkedin) info.linkedin = entry.linkedin;

  return info;
}

export {
  EVENT_DETAILS,
  ADMIN_PERSONAS,
  createApplication,
  listApplications,
  approveApplication,
  rejectApplication,
  deleteApplication,
  findMemberByToken,
  updateMember,
  createInviteForMember,
  createAdminInvite,
  listAdminInvites,
  deleteInvite,
  claimInvite,
  getInviteStats,
  listGuestlist,
  addToGuestlist,
  updateGuestlistEntry,
  deleteFromGuestlist,
  findGuestlistByInviteId,
  getInviteInfo,
  listMembers,
  isSupabaseEnabled,
  isAirtableEnabled,
};
