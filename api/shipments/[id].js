import { z } from 'zod';
import { Shipment } from '../../../server/src/models/index.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method Not Allowed' });

    const schema = z.object({ status: z.enum(['Pending', 'In Transit', 'Delivered']) });
    const { status } = schema.parse(req.body || {});

    const { id } = req.query;
    const shipment = await Shipment.findByPk(id);
    if (!shipment) return res.status(404).json({ error: 'Shipment not found' });

    await shipment.update({ status, updatedAt: new Date().toISOString().slice(0, 10) });
    res.status(200).json(shipment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

