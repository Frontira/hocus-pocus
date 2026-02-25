import crypto from 'node:crypto';

const ADMIN_SECRET = String(process.env.ADMIN_SECRET || '').trim();
const ADMIN_COOKIE_NAME = 'hp_admin_session';

function sessionToken() {
  if (!ADMIN_SECRET) return '';
  return crypto.createHash('sha256').update(`hp-admin:${ADMIN_SECRET}`).digest('hex');
}

function parseCookies(cookieHeader) {
  const raw = String(cookieHeader || '');
  if (!raw) return {};
  return raw.split(';').reduce((acc, chunk) => {
    const part = chunk.trim();
    if (!part) return acc;
    const sep = part.indexOf('=');
    if (sep === -1) return acc;
    const key = part.slice(0, sep).trim();
    const value = decodeURIComponent(part.slice(sep + 1).trim());
    if (key) acc[key] = value;
    return acc;
  }, {});
}

function readAdminSecret(req) {
  const fromHeader = String(req.headers['x-admin-secret'] || '').trim();
  if (fromHeader) return fromHeader;

  const authHeader = String(req.headers.authorization || '').trim();
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }

  return '';
}

function hasAdminSession(req) {
  const cookies = parseCookies(req.headers.cookie);
  return cookies[ADMIN_COOKIE_NAME] === sessionToken();
}

function verifyAdminSecret(secret) {
  return String(secret || '').trim() === ADMIN_SECRET;
}

function setAdminSessionCookie(res) {
  const value = encodeURIComponent(sessionToken());
  const isSecure = String(res.req?.headers?.['x-forwarded-proto'] || '').includes('https');
  const secureFlag = isSecure ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${ADMIN_COOKIE_NAME}=${value}; HttpOnly; Path=/; SameSite=Strict; Max-Age=28800${secureFlag}`
  );
}

function clearAdminSessionCookie(res) {
  const isSecure = String(res.req?.headers?.['x-forwarded-proto'] || '').includes('https');
  const secureFlag = isSecure ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${ADMIN_COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0${secureFlag}`
  );
}

function requireAdmin(req, res) {
  if (!ADMIN_SECRET) {
    res.status(500).json({ error: 'ADMIN_SECRET is not configured' });
    return false;
  }

  if (hasAdminSession(req)) return true;

  if (readAdminSecret(req) !== ADMIN_SECRET) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }

  return true;
}

export { requireAdmin, verifyAdminSecret, setAdminSessionCookie, clearAdminSessionCookie };
