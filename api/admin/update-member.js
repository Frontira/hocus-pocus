import { requireAdmin } from '../_auth.js';
import { updateMember } from '../_storage.js';
import { logEvent } from '../_events.js';

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!requireAdmin(req, res)) return;

  try {
    const memberId = String(req.body?.memberId || '').trim();
    if (!memberId) {
      return res.status(400).json({ error: 'memberId is required' });
    }

    const fields = {};

    if (req.body.inviteLimit !== undefined) {
      const limit = parseInt(req.body.inviteLimit, 10);
      if (isNaN(limit) || limit < 0) {
        return res.status(400).json({ error: 'inviteLimit must be a non-negative number' });
      }
      fields.inviteLimit = limit;
    }

    if (Object.keys(fields).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const updated = await updateMember(memberId, fields);
    if (!updated) {
      return res.status(404).json({ error: 'Member not found' });
    }

    await logEvent('member.updated', {
      actor: 'admin',
      target: updated.email,
      data: { memberId, fields },
    });

    return res.status(200).json({ success: true, member: updated });
  } catch (error) {
    console.error('admin update-member error', error);
    return res.status(500).json({ error: 'Failed to update member' });
  }
}
