import { requireAdmin } from '../_auth.js';
import { listAdminInvites } from '../_storage.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!requireAdmin(req, res)) return;

  try {
    const invites = await listAdminInvites();
    return res.status(200).json({ success: true, invites });
  } catch (error) {
    console.error('admin invites list error', error);
    return res.status(500).json({ error: 'Failed to list admin invites' });
  }
}
