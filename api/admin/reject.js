import { requireAdmin } from '../_auth.js';
import { rejectApplication } from '../_storage.js';

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

    return res.status(200).json({ success: true, application: result.application });
  } catch (error) {
    console.error('admin reject error', error);
    return res.status(500).json({ error: 'Failed to reject application' });
  }
}
