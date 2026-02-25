import { setAdminSessionCookie, verifyAdminSecret } from '../_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = String(req.body?.secret || req.headers['x-admin-secret'] || '').trim();
  if (!verifyAdminSecret(secret)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  setAdminSessionCookie(res);
  return res.status(200).json({ success: true });
}
