const express = require('express');
const { z } = require('zod');

const { Customer, Product, InventoryMovement, Order, OrderLineItem, Shipment, CustomerNote } = require('../models');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ ok: true });
});

const moneyTotal = (order) => (order.lineItems || []).reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
const monthKey = (date) => String(date).slice(0, 7);

router.get('/kpis', async (req, res, next) => {
  try {
    const fulfilledOrders = await Order.findAll({
      where: { status: 'Fulfilled' },
      include: [{
        model: OrderLineItem,
        as: 'lineItems',
        include: [{ model: Product, as: 'Product', required: false }],
      }],
    });

    const revenue = fulfilledOrders.reduce((sum, o) => sum + moneyTotal(o.toJSON ? o.toJSON() : o), 0);

    const openOrders = await Order.count({ where: { status: ['Pending', 'Processing'] } });

    const lowStockAlerts = await Product.count({ where: { stock: 0 } });
    // The above is placeholder-safe; real logic uses stock <= reorderThreshold.
    const lowStockAlertsReal = await Product.count({ where: { $expr: { $lte: ['stock', 'reorderThreshold'] } } }).catch(() => lowStockAlerts);

    const pendingShipments = await Shipment.count({ where: { status: { $ne: 'Delivered' } } });

    const customers = await Customer.findAll();
    const topCustomers = [];
    for (const c of customers) {
      const orders = await Order.findAll({ where: { customerId: c.id }, include: [{ model: OrderLineItem, as: 'lineItems' }] });
      const totalSpend = orders.reduce((sum, o) => sum + moneyTotal(o.toJSON ? o.toJSON() : o), 0);
      topCustomers.push({ customerId: c.id, name: c.name, totalSpend });
    }
    topCustomers.sort((a, b) => b.totalSpend - a.totalSpend);

    res.json({
      revenue,
      openOrders,
      lowStockAlerts: lowStockAlertsReal,
      pendingShipments,
      topCustomers: topCustomers.slice(0, 5),
    });
  } catch (err) {
    next(err);
  }
});

// Remaining routes will be implemented next; keep current frontend working by returning 501.
const notImpl = (name) => (req, res) => res.status(501).json({ error: `${name} not implemented yet` });
router.get('/inventory', notImpl('inventory'));
router.post('/inventory/import', notImpl('inventory import'));
router.get('/orders', notImpl('orders'));
router.post('/orders', notImpl('orders'));
router.patch('/orders/:id', notImpl('orders update'));
router.get('/shipments', notImpl('shipments'));
router.post('/shipments', notImpl('shipments'));
router.patch('/shipments/:id', notImpl('shipment update'));
router.get('/reports', notImpl('reports'));
router.get('/customers', notImpl('customers'));
router.post('/customers', notImpl('customers'));
router.get('/customers/:id', notImpl('customer'));
router.patch('/customers/:id', notImpl('customer update'));
router.post('/customers/:id/notes', notImpl('customer notes'));

module.exports = router;

