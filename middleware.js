const ADMIN_COOKIE_NAME = 'hp_admin_session';

function parseCookies(header) {
  const raw = String(header || '');
  if (!raw) return {};
  return raw.split(';').reduce((acc, part) => {
    const chunk = part.trim();
    if (!chunk) return acc;
    const sep = chunk.indexOf('=');
    if (sep === -1) return acc;
    const key = chunk.slice(0, sep).trim();
    const value = decodeURIComponent(chunk.slice(sep + 1).trim());
    if (key) acc[key] = value;
    return acc;
  }, {});
}

async function sha256Hex(input) {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function expectedSessionToken() {
  const secret = String(process.env.ADMIN_SECRET || '').trim();
  if (!secret) return '';
  return sha256Hex(`hp-admin:${secret}`);
}

export default async function middleware(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  if (pathname !== '/admin.html' && pathname !== '/admin-login.html') {
    return;
  }

  const expected = await expectedSessionToken();
  if (!expected) {
    return new Response('ADMIN_SECRET is not configured', { status: 500 });
  }

  const cookies = parseCookies(request.headers.get('cookie'));
  const hasSession = cookies[ADMIN_COOKIE_NAME] === expected;

  if (pathname === '/admin.html' && !hasSession) {
    const location = new URL('/admin-login.html', request.url);
    return Response.redirect(location, 307);
  }

  if (pathname === '/admin-login.html' && hasSession) {
    const location = new URL('/admin.html', request.url);
    return Response.redirect(location, 307);
  }

  return;
}
