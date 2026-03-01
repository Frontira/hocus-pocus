import { requireAdmin } from '../_auth.js';
import { approveApplication, updateMember } from '../_storage.js';
import { sendApprovalEmail } from '../_email.js';
import { scrapeLinkedInName } from '../_linkedin.js';
import { logEvent } from '../_events.js';

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

    await logEvent('application.approved', {
      actor: 'admin',
      target: result.application.email,
      data: { applicationId, memberId: result.member.id },
    });

    // Send approval email with access link
    const emailResult = await sendApprovalEmail({
      email: result.application.email,
      memberToken: result.member.accessToken,
    }).catch((err) => {
      console.error('[email] approval email failed', err);
      return { ok: false, error: err.message };
    });

    await logEvent(emailResult?.ok ? 'email.sent' : 'email.failed', {
      actor: 'system',
      target: result.application.email,
      data: { template: 'approval', subject: emailResult?.subject, messageId: emailResult?.messageId, error: emailResult?.error },
    });

    // Enrich member name from LinkedIn (fire and forget)
    if (result.member.linkedin && !result.member.name) {
      scrapeLinkedInName(result.member.linkedin)
        .then((name) => {
          if (name) {
            updateMember(result.member.id, { name });
            logEvent('member.enriched', {
              actor: 'system',
              target: result.application.email,
              data: { memberId: result.member.id, name },
            });
          }
        })
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
