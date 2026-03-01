import { requireAdmin } from '../_auth.js';
import { listGuestlist, addToGuestlist, deleteFromGuestlist, updateGuestlistEntry, ADMIN_PERSONAS } from '../_storage.js';
import { logEvent } from '../_events.js';

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;

  // GET - list all guest list entries
  if (req.method === 'GET') {
    try {
      const entries = await listGuestlist();
      const enriched = entries.map((g) => ({
        ...g,
        senderName: ADMIN_PERSONAS[g.senderPersona]?.name || g.senderPersona,
      }));
      return res.status(200).json({ success: true, guestlist: enriched });
    } catch (error) {
      console.error('guestlist list error', error);
      return res.status(500).json({ error: 'Failed to load guest list' });
    }
  }

  // POST - add entry
  if (req.method === 'POST') {
    try {
      const email = String(req.body?.email || '').trim();
      const linkedin = String(req.body?.linkedin || '').trim();
      const senderPersona = String(req.body?.senderPersona || 'joanna').trim();

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const entry = await addToGuestlist({ email, linkedin, senderPersona });

      await logEvent('guestlist.added', {
        actor: 'admin',
        target: email,
        data: { guestlistId: entry.id, linkedin, senderPersona },
      });

      return res.status(200).json({
        success: true,
        entry: { ...entry, senderName: ADMIN_PERSONAS[senderPersona]?.name || senderPersona },
      });
    } catch (error) {
      console.error('guestlist add error', error);
      return res.status(500).json({ error: 'Failed to add to guest list' });
    }
  }

  // PATCH - update entry
  if (req.method === 'PATCH') {
    try {
      const id = String(req.body?.id || '').trim();
      if (!id) return res.status(400).json({ error: 'id is required' });

      const fields = {};
      if (req.body.email !== undefined) fields.email = String(req.body.email).trim().toLowerCase();
      if (req.body.linkedin !== undefined) fields.linkedin = String(req.body.linkedin).trim();
      if (req.body.senderPersona !== undefined) fields.senderPersona = String(req.body.senderPersona).trim();

      const updated = await updateGuestlistEntry(id, fields);
      if (!updated) return res.status(404).json({ error: 'Entry not found' });

      await logEvent('guestlist.updated', {
        actor: 'admin',
        target: updated.email,
        data: { guestlistId: id, fields },
      });

      return res.status(200).json({ success: true, entry: updated });
    } catch (error) {
      console.error('guestlist update error', error);
      return res.status(500).json({ error: 'Failed to update entry' });
    }
  }

  // DELETE - remove entry
  if (req.method === 'DELETE') {
    try {
      const id = String(req.body?.id || req.query?.id || '').trim();
      if (!id) return res.status(400).json({ error: 'id is required' });
      await deleteFromGuestlist(id);

      await logEvent('guestlist.deleted', {
        actor: 'admin',
        data: { guestlistId: id },
      });

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('guestlist delete error', error);
      return res.status(500).json({ error: 'Failed to delete entry' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
