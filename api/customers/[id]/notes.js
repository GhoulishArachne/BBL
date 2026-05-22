import { Customer, CustomerNote } from '../../../../server/src/models/index.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { id } = req.query;
    const body = req.body?.body;
    if (!body || typeof body !== 'string' || body.trim().length === 0) {
      return res.status(400).json({ error: 'body is required' });
    }

    const customer = await Customer.findByPk(id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const note = await CustomerNote.create({
      id: `note_${Date.now()}`,
      customerId: customer.id,
      body,
      createdAt: new Date().toISOString().slice(0, 10),
    });

    res.status(201).json(note);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

