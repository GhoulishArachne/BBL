import { Order, OrderLineItem, Product } from '../server/src/models/index.js';

function moneyTotal(order) {
  return (order.lineItems || []).reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
}

function monthKey(date) {
  return String(date).slice(0, 7);
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

    const fulfilled = await Order.findAll({
      where: { status: 'Fulfilled' },
      include: [
        {
          model: OrderLineItem,
          as: 'lineItems',
          include: [{ model: Product, required: false }],
        },
      ],
    });

    const byMonth = new Map();
    for (const o of fulfilled) {
      const m = monthKey(o.createdAt);
      if (!byMonth.has(m)) byMonth.set(m, { month: m, revenue: 0, orders: 0 });
      const bucket = byMonth.get(m);
      bucket.revenue += moneyTotal(o.toJSON ? o.toJSON() : o);
      bucket.orders += 1;
    }

    const revenueTrends = Array.from(byMonth.values()).sort((a, b) => a.month.localeCompare(b.month));

    const unitsByProduct = new Map();
    for (const o of fulfilled) {
      const items = o.lineItems || [];
      for (const li of items) {
        const productName = li.Product?.name || li.product?.name || undefined;
        const key = li.productId;
        const existing = unitsByProduct.get(key) || { name: productName || key, units: 0 };
        existing.units += li.quantity;
        existing.name = existing.name || productName || key;
        unitsByProduct.set(key, existing);
      }
    }

    const topProducts = Array.from(unitsByProduct.values())
      .sort((a, b) => b.units - a.units)
      .slice(0, 5);

    const turnover = [];
    for (const [productId, stat] of unitsByProduct.entries()) {
      const product = await Product.findByPk(productId);
      const stock = product ? product.stock : 0;
      const denom = Math.max(1, stock);
      turnover.push({ name: stat.name, turnover: stat.units / denom });
    }

    res.status(200).json({
      revenueTrends,
      topProducts,
      inventoryTurnover: turnover.sort((a, b) => b.turnover - a.turnover).slice(0, 8),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

