import { requireAdmin } from '../_auth.js';
import { deleteApplication } from '../_storage.js';
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

    await deleteApplication(applicationId);

    await logEvent('application.deleted', {
      actor: 'admin',
      data: { applicationId },
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('admin delete error', error);
    return res.status(500).json({ error: 'Failed to delete application' });
  }
}
