import { requireAdmin } from '../_auth.js';
import { approveApplication, updateMember } from '../_storage.js';
import { sendApprovalEmail } from '../_email.js';
import { scrapeLinkedInName } from '../_linkedin.js';

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

    // Send approval email with access link
    await sendApprovalEmail({
      email: result.application.email,
      memberToken: result.member.accessToken,
    }).catch((err) => console.error('[email] approval email failed', err));

    // Enrich member name from LinkedIn (fire and forget)
    if (result.member.linkedin && !result.member.name) {
      scrapeLinkedInName(result.member.linkedin)
        .then((name) => name && updateMember(result.member.id, { name }))
        .catch((err) => console.error('[linkedin] enrich failed', err));
    }

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
