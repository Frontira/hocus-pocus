import { createInviteForMember, findMemberByToken } from '../_storage.js';
import { sendInviteEmail } from '../_email.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const memberToken = String(req.body?.memberToken || '').trim();
    const recipientEmail = String(req.body?.recipientEmail || '').trim();
    const origin = String(req.body?.origin || req.headers.origin || '').trim();

    if (!memberToken) {
      return res.status(400).json({ error: 'memberToken is required' });
    }

    const member = await findMemberByToken(memberToken);
    const result = await createInviteForMember(memberToken, origin, {
      recipientEmail: recipientEmail || null,
    });
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    // Send invite email if recipient provided (fire and forget)
    if (recipientEmail) {
      sendInviteEmail({
        recipientEmail,
        inviterEmail: member?.email || 'a guest',
        inviteUrl: result.inviteUrl,
        expiresAt: result.invite.expiresAt,
      }).catch((err) => console.error('[email] invite email failed', err));
    }

    return res.status(200).json({
      success: true,
      inviteUrl: result.inviteUrl,
      expiresAt: result.invite.expiresAt,
      remainingAfterCreate: result.remainingAfterCreate,
      method: recipientEmail ? 'email' : 'link',
    });
  } catch (error) {
    console.error('invite create error', error);
    return res.status(500).json({ error: 'Failed to create invite' });
  }
}
