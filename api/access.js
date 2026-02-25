import { EVENT_DETAILS, findMemberByToken, getInviteStats } from './_storage.js';

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = String(req.method === 'GET' ? req.query?.token : req.body?.token || '').trim();
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const member = await findMemberByToken(token);
    if (!member) {
      return res.status(401).json({ error: 'Invalid or expired access token' });
    }

    const stats = await getInviteStats(token);

    return res.status(200).json({
      success: true,
      member: {
        id: member.id,
        email: member.email,
        linkedin: member.linkedin,
      },
      event: EVENT_DETAILS,
      invites: {
        remaining: stats.remaining,
        totalGenerated: stats.totalGenerated,
        limit: 2,
        history: stats.history || [],
      },
    });
  } catch (error) {
    console.error('access error', error);
    return res.status(500).json({ error: 'Failed to validate access' });
  }
}
