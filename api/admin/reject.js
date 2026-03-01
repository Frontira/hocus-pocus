import { requireAdmin } from '../_auth.js';
import { rejectApplication } from '../_storage.js';
import { sendRejectionEmail } from '../_email.js';
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

    const result = await rejectApplication(applicationId);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    await logEvent('application.rejected', {
      actor: 'admin',
      target: result.application.email,
      data: { applicationId },
    });

    // Send rejection email
    const emailResult = await sendRejectionEmail({ email: result.application.email }).catch((err) => {
      console.error('[email] rejection email failed', err);
      return { ok: false, error: err.message };
    });

    await logEvent(emailResult?.ok ? 'email.sent' : 'email.failed', {
      actor: 'system',
      target: result.application.email,
      data: { template: 'rejection', subject: emailResult?.subject, messageId: emailResult?.messageId, error: emailResult?.error },
    });

    return res.status(200).json({ success: true, application: result.application });
  } catch (error) {
    console.error('admin reject error', error);
    return res.status(500).json({ error: 'Failed to reject application' });
  }
}
