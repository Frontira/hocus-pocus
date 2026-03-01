import { getInviteInfo } from '../_storage.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const inviteToken = String(req.body?.inviteToken || '').trim();
    if (!inviteToken) {
      return res.status(400).json({ error: 'inviteToken is required' });
    }

    const info = await getInviteInfo(inviteToken);
    if (!info) {
      return res.status(200).json({ success: true });
    }

    return res.status(200).json({
      success: true,
      recipientEmail: info.recipientEmail,
      linkedin: info.linkedin,
    });
  } catch (error) {
    console.error('invite info error', error);
    return res.status(200).json({ success: true });
  }
}
