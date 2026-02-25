import { createInviteForMember } from '../_storage.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const memberToken = String(req.body?.memberToken || '').trim();
    const origin = String(req.body?.origin || req.headers.origin || '').trim();

    if (!memberToken) {
      return res.status(400).json({ error: 'memberToken is required' });
    }

    const result = await createInviteForMember(memberToken, origin);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    return res.status(200).json({
      success: true,
      inviteUrl: result.inviteUrl,
      expiresAt: result.invite.expiresAt,
      remainingAfterCreate: result.remainingAfterCreate,
    });
  } catch (error) {
    console.error('invite create error', error);
    return res.status(500).json({ error: 'Failed to create invite' });
  }
}
