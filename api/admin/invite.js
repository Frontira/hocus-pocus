import { requireAdmin } from '../_auth.js';
import { createAdminInvite, updateGuestlistEntry } from '../_storage.js';
import { sendInviteEmail } from '../_email.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!requireAdmin(req, res)) return;

  try {
    const recipientEmail = String(req.body?.recipientEmail || '').trim();
    const senderPersona = String(req.body?.senderPersona || '').trim();
    const guestlistId = String(req.body?.guestlistId || '').trim() || null;
    const origin = String(req.body?.origin || req.headers.origin || '').trim();

    if (!recipientEmail) {
      return res.status(400).json({ error: 'recipientEmail is required' });
    }
    if (!senderPersona) {
      return res.status(400).json({ error: 'senderPersona is required' });
    }

    const result = await createAdminInvite(origin, { recipientEmail, senderPersona });
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    // Link invite to guestlist entry
    if (guestlistId) {
      await updateGuestlistEntry(guestlistId, {
        status: 'invited',
        sentAt: new Date().toISOString(),
        inviteId: result.invite.id,
      }).catch((err) => console.error('[guestlist] update failed', err));
    }

    // Send invite email as the chosen persona (await to ensure delivery)
    await sendInviteEmail({
      recipientEmail,
      inviterEmail: result.persona.email,
      inviterName: result.persona.name,
      inviteUrl: result.inviteUrl,
      expiresAt: result.invite.expiresAt,
    }).catch((err) => console.error('[email] admin invite email failed', err));

    return res.status(200).json({
      success: true,
      inviteUrl: result.inviteUrl,
      expiresAt: result.invite.expiresAt,
      senderName: result.persona.name,
    });
  } catch (error) {
    console.error('admin invite error', error);
    return res.status(500).json({ error: 'Failed to create admin invite' });
  }
}
