import { Customer, Product, Order, OrderLineItem, Shipment } from '../server/src/models/index.js';
import { sequelize } from '../server/src/config/db.js';

// Ensure models are initialized before queries
// (Sequelize connection is created by importing db.js)

function moneyTotal(order) {
  return (order.lineItems || []).reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

    const fulfilledOrders = await Order.findAll({
      where: { status: 'Fulfilled' },
      include: [
        {
          model: OrderLineItem,
          as: 'lineItems',
          include: [{ model: Product, as: 'Product', required: false }],
        },
      ],
    });

    const revenue = fulfilledOrders.reduce((sum, o) => sum + moneyTotal(o.toJSON ? o.toJSON() : o), 0);
    const openOrders = await Order.count({ where: { status: ['Pending', 'Processing'] } });
    const lowStockAlerts = await Product.count({
      where: {
        $expr: { $lte: ['stock', 'reorderThreshold'] },
      },
    }).catch(() => 0);

    const pendingShipments = await Shipment.count({ where: { status: { $ne: 'Delivered' } } });

    const customers = await Customer.findAll();
    const topCustomers = [];
    for (const c of customers) {
      const orders = await Order.findAll({
        where: { customerId: c.id },
        include: [{ model: OrderLineItem, as: 'lineItems' }],
      });
      const totalSpend = orders.reduce((sum, o) => sum + moneyTotal(o.toJSON ? o.toJSON() : o), 0);
      topCustomers.push({ customerId: c.id, name: c.name, totalSpend });
    }

    topCustomers.sort((a, b) => b.totalSpend - a.totalSpend);

    res.status(200).json({
      revenue,
      openOrders,
      lowStockAlerts: lowStockAlerts,
      pendingShipments,
      topCustomers: topCustomers.slice(0, 5),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    // Optional: keep connection for serverless warm starts
  }
}

