import { requireAdmin } from '../_auth.js';
import { deleteMember, listMembers } from '../_storage.js';
import { logEvent } from '../_events.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!requireAdmin(req, res)) return;

  try {
    const memberId = String(req.body?.memberId || '').trim();
    if (!memberId) {
      return res.status(400).json({ error: 'memberId is required' });
    }

    const members = await listMembers();
    const member = members.find((m) => m.id === memberId);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    await deleteMember(memberId);

    await logEvent('member.deleted', {
      actor: 'admin',
      target: member.email,
      data: { memberId, name: member.name },
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('admin delete-member error', error);
    return res.status(500).json({ error: 'Failed to delete member' });
  }
}
