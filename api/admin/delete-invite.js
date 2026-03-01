import { requireAdmin } from '../_auth.js';
import { deleteInvite } from '../_storage.js';
import { logEvent } from '../_events.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!requireAdmin(req, res)) return;

  try {
    const inviteId = String(req.body?.inviteId || '').trim();
    if (!inviteId) {
      return res.status(400).json({ error: 'inviteId is required' });
    }

    await deleteInvite(inviteId);

    await logEvent('invite.deleted', {
      actor: 'admin',
      data: { inviteId },
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('admin delete-invite error', error);
    return res.status(500).json({ error: 'Failed to delete invite' });
  }
}
