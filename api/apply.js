import { createApplication, isSupabaseEnabled } from './_storage.js';
import { sendNewApplicationNotice } from './_email.js';
import { notifyNewApplication } from './_discord.js';
import { logEvent } from './_events.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const email = String(req.body?.email || '').trim();
    const linkedin = String(req.body?.linkedin || '').trim();

    if (!email || !linkedin) {
      return res.status(400).json({ error: 'Email and LinkedIn are required' });
    }

    const app = await createApplication({ email, linkedin, source: 'public' });

    await logEvent('application.created', {
      actor: email,
      target: email,
      data: { applicationId: app.id, linkedin, source: 'public' },
    });

    // Notify organizer
    const [emailResult] = await Promise.all([
      sendNewApplicationNotice({ email, linkedin }).catch((err) => {
        console.error('[email] new application notice failed', err);
        return { ok: false, error: err.message };
      }),
      notifyNewApplication({ email, linkedin }).catch((err) =>
        console.error('[discord] new application notice failed', err)
      ),
    ]);

    await logEvent(emailResult?.ok ? 'email.sent' : 'email.failed', {
      actor: 'system',
      target: 'jb@frontira.io',
      data: { template: 'new_application_notice', subject: emailResult?.subject, messageId: emailResult?.messageId, error: emailResult?.error, triggerEmail: email },
    });

    return res.status(200).json({
      success: true,
      applicationId: app.id,
      storageMode: isSupabaseEnabled() ? 'supabase' : 'memory',
      message: 'Application received',
    });
  } catch (error) {
    console.error('apply error', error);
    return res.status(500).json({ error: 'Failed to submit application' });
  }
}
