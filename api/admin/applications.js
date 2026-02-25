import { requireAdmin } from '../_auth.js';
import { listApplications } from '../_storage.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!requireAdmin(req, res)) return;

  try {
    const applications = await listApplications();
    applications.sort((a, b) => Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0));
    return res.status(200).json({ success: true, applications });
  } catch (error) {
    console.error('admin applications error', error);
    return res.status(500).json({ error: 'Failed to load applications' });
  }
}
