import { requireAdmin } from '../_auth.js';
import { listEvents } from '../_events.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!requireAdmin(req, res)) return;

  try {
    const limit = Math.min(parseInt(req.query?.limit, 10) || 100, 500);
    const offset = parseInt(req.query?.offset, 10) || 0;
    const type = req.query?.type || undefined;
    const actor = req.query?.actor || undefined;
    const target = req.query?.target || undefined;

    const events = await listEvents({ limit, offset, type, actor, target });

    return res.status(200).json({ success: true, events, count: events.length });
  } catch (error) {
    console.error('admin events error', error);
    return res.status(500).json({ error: 'Failed to load events' });
  }
}
