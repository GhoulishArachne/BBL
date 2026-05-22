import { Shipment, Order, Customer } from '../server/src/models/index.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

    const shipments = await Shipment.findAll({
      order: [['updatedAt', 'DESC']],
      include: [{ model: Order, required: false, include: [{ model: Customer, required: false }] }],
    });

    res.status(200).json(shipments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

