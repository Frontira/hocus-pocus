import { claimInvite, updateMember, findGuestlistByInviteId, updateGuestlistEntry, ADMIN_PERSONAS } from '../_storage.js';
import { sendApprovalEmail, sendInviteClaimedNotice } from '../_email.js';
import { scrapeLinkedInName } from '../_linkedin.js';
import { notifyInviteClaimed } from '../_discord.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const inviteToken = String(req.body?.inviteToken || '').trim();
    const email = String(req.body?.email || '').trim();
    const linkedin = String(req.body?.linkedin || '').trim();

    const result = await claimInvite(inviteToken, { email, linkedin });
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    // Send "You're in" email to the new member
    await sendApprovalEmail({
      email,
      memberToken: result.member.accessToken,
    }).catch((err) => console.error('[email] claim approval email failed', err));

    // Notify inviter
    if (result.inviter) {
      await sendInviteClaimedNotice({
        inviterEmail: result.inviter.email,
        claimerEmail: email,
        remaining: result.inviterRemaining,
      }).catch((err) => console.error('[email] invite claimed notice failed', err));
    } else if (result.senderPersona) {
      const persona = ADMIN_PERSONAS[result.senderPersona];
      if (persona) {
        await sendInviteClaimedNotice({
          inviterEmail: persona.email,
          claimerEmail: email,
          remaining: -1,
        }).catch((err) => console.error('[email] admin invite claimed notice failed', err));
      }
    }

    await notifyInviteClaimed({ email, linkedin }).catch((err) =>
      console.error('[discord] invite claimed notice failed', err)
    );

    // Update guestlist entry if this was an admin invite
    if (result.inviteId) {
      const entry = await findGuestlistByInviteId(result.inviteId).catch(() => null);
      if (entry) await updateGuestlistEntry(entry.id, { status: 'claimed' }).catch(() => {});
    }

    // Enrich member name from LinkedIn (fire and forget - ok if this doesn't complete)
    if (linkedin && !result.member.name) {
      scrapeLinkedInName(linkedin)
        .then((name) => name && updateMember(result.member.id, { name }))
        .catch((err) => console.error('[linkedin] enrich failed', err));
    }

    return res.status(200).json({
      success: true,
      memberToken: result.member.accessToken,
      member: {
        id: result.member.id,
        email: result.member.email,
      },
    });
  } catch (error) {
    console.error('invite claim error', error);
    return res.status(500).json({ error: 'Failed to claim invite' });
  }
}
