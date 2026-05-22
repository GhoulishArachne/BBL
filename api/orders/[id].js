import { z } from 'zod';
import { Order, OrderLineItem, Product } from '../../../server/src/models/index.js';

const moneyTotal = (order) => (order.lineItems || []).reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

export default async function handler(req, res) {
  try {
    if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method Not Allowed' });

    const schema = z.object({ status: z.enum(['Pending', 'Processing', 'Fulfilled']) });
    const { status } = schema.parse(req.body || {});

    const { id } = req.query;
    const order = await Order.findByPk(id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const prev = order.status;
    await order.update({ status });

    if (prev !== 'Fulfilled' && status === 'Fulfilled') {
      const lineItems = await OrderLineItem.findAll({ where: { orderId: order.id }, include: [{ model: Product, required: false }] });
      for (const li of lineItems) {
        const product = await Product.findByPk(li.productId);
        if (!product) continue;
        const prevStock = product.stock;
        const newStock = prevStock - li.quantity;
        await product.update({ stock: newStock });
      }
    }

    res.status(200).json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

