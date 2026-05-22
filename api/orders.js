import { Customer, Order, OrderLineItem, Product } from '../server/src/models/index.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

    const orders = await Order.findAll({
      order: [['createdAt', 'DESC']],
      include: [
        { model: Customer, required: false },
        {
          model: OrderLineItem,
          as: 'lineItems',
          include: [{ model: Product, required: false }],
        },
      ],
    });

    res.status(200).json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

