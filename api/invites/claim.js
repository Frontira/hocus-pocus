import { claimInvite } from '../_storage.js';

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
