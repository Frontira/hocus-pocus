import { requireAdmin } from '../_auth.js';
import { approveApplication } from '../_storage.js';
import { sendApprovalEmail } from '../_email.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!requireAdmin(req, res)) return;

  try {
    const applicationId = String(req.body?.applicationId || '').trim();
    if (!applicationId) {
      return res.status(400).json({ error: 'applicationId is required' });
    }

    const result = await approveApplication(applicationId);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    // Send approval email with access link (fire and forget)
    sendApprovalEmail({
      email: result.application.email,
      memberToken: result.member.accessToken,
    }).catch((err) => console.error('[email] approval email failed', err));

    return res.status(200).json({
      success: true,
      application: result.application,
      member: result.member,
    });
  } catch (error) {
    console.error('admin approve error', error);
    return res.status(500).json({ error: 'Failed to approve application' });
  }
}
