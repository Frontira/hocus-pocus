import { createApplication, isSupabaseEnabled } from './_storage.js';
import { sendNewApplicationNotice } from './_email.js';
import { notifyNewApplication } from './_discord.js';

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

    // Notify organizer
    await Promise.all([
      sendNewApplicationNotice({ email, linkedin }).catch((err) =>
        console.error('[email] new application notice failed', err)
      ),
      notifyNewApplication({ email, linkedin }).catch((err) =>
        console.error('[discord] new application notice failed', err)
      ),
    ]);

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
