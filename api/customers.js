import { Customer } from '../server/src/models/index.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

    const customers = await Customer.findAll({ order: [['name', 'ASC']] });
    res.status(200).json(customers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

