import { Customer, CustomerNote, Order, OrderLineItem, Product, Shipment } from '../../server/src/models/index.js';

function moneyTotal(order) {
  return (order.lineItems || []).reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

    const { id } = req.query;
    const customer = await Customer.findByPk(id, { include: [{ model: CustomerNote, as: 'notes' }] });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const orders = await Order.findAll({
      where: { customerId: customer.id },
      include: [
        {
          model: OrderLineItem,
          as: 'lineItems',
          include: [{ model: Product, required: false }],
        },
      ],
    });

    const purchaseHistory = orders.map((o) => {
      const json = o.toJSON ? o.toJSON() : o;
      return { ...json, total: moneyTotal(json) };
    });

    const openShipments = await Shipment.findAll({
      include: [{ model: Order, required: true, where: { customerId: customer.id } }],
      where: { status: { $ne: 'Delivered' } },
    });

    res.status(200).json({
      ...(customer.toJSON ? customer.toJSON() : customer),
      purchaseHistory,
      totalSpend: purchaseHistory.filter((o) => o.status === 'Fulfilled').reduce((sum, o) => sum + (o.total || 0), 0),
      openShipments,
      notes: customer.notes || [],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

