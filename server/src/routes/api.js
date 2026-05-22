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

// ------------------------------
// Inventory
// ------------------------------
router.get('/inventory', async (req, res, next) => {
  try {
    const products = await Product.findAll({ order: [['sku', 'ASC']] });
    res.json(products);
  } catch (err) {
    next(err);
  }
});

const parseCsvLines = (csv) => {
  // Simple CSV parser: assumes no embedded newlines/commas.
  // Expected columns:
  // sku,name,category,stock,reorderThreshold,price
  const lines = String(csv || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];
  const header = lines[0].split(',').map((s) => s.trim());
  const idx = (col) => header.indexOf(col);

  const required = ['sku', 'name', 'category', 'stock', 'reorderThreshold', 'price'];
  for (const col of required) {
    if (idx(col) === -1) {
      throw new Error(`CSV missing required column: ${col}`);
    }
  }

  const skuIdx = idx('sku');
  const nameIdx = idx('name');
  const categoryIdx = idx('category');
  const stockIdx = idx('stock');
  const reorderThresholdIdx = idx('reorderThreshold');
  const priceIdx = idx('price');

  const rows = lines.slice(1).map((line) => line.split(',').map((s) => s.trim()));
  return rows.map((cols) => {
    const stock = Number(cols[stockIdx] ?? 0);
    const reorderThreshold = Number(cols[reorderThresholdIdx] ?? 0);
    const price = Number(cols[priceIdx] ?? 0);

    return {
      sku: cols[skuIdx],
      name: cols[nameIdx],
      category: cols[categoryIdx],
      stock: Number.isFinite(stock) ? Math.trunc(stock) : 0,
      reorderThreshold: Number.isFinite(reorderThreshold) ? Math.trunc(reorderThreshold) : 0,
      price: Number.isFinite(price) ? Math.trunc(price) : 0,
    };
  });
};

router.post('/inventory/import', async (req, res, next) => {
  try {
    const schema = z.object({
      csv: z.string().min(1),
    });

    const { csv } = schema.parse(req.body);

    const rows = parseCsvLines(csv);

    // Upsert by SKU. If product exists, replace stock/threshold/price.
    // Also create an inventory movement for stock 'in' equal to the delta.
    for (const row of rows) {
      const product = await Product.findOne({ where: { sku: row.sku } });
      if (!product) {
        const id = `prod_${row.sku}`;
        await Product.create({
          id,
          sku: row.sku,
          name: row.name,
          category: row.category,
          stock: row.stock,
          reorderThreshold: row.reorderThreshold,
          price: row.price,
        });
        await InventoryMovement.create({
          id: `inv_${id}_init`,
          productId: id,
          type: 'in',
          quantity: row.stock,
          createdAt: new Date().toISOString().slice(0, 10),
        });
      } else {
        const prevStock = product.stock;
        const nextStock = row.stock;
        const delta = nextStock - prevStock;

        await product.update({
          name: row.name,
          category: row.category,
          stock: nextStock,
          reorderThreshold: row.reorderThreshold,
          price: row.price,
        });

        await InventoryMovement.create({
          id: `inv_${product.id}_${Date.now()}`,
          productId: product.id,
          type: delta >= 0 ? 'in' : 'out',
          quantity: Math.abs(delta),
          createdAt: new Date().toISOString().slice(0, 10),
        });
      }
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ------------------------------
// Orders
// ------------------------------
router.get('/orders', async (req, res, next) => {
  try {
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
    res.json(orders);
  } catch (err) {
    next(err);
  }
});

router.patch('/orders/:id', async (req, res, next) => {
  try {
    const schema = z.object({
      status: z.enum(['Pending', 'Processing', 'Fulfilled']),
    });
    const { status } = schema.parse(req.body);

    const order = await Order.findByPk(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const prev = order.status;
    await order.update({ status });

    // If transitioning to Fulfilled, decrement inventory once.
    if (prev !== 'Fulfilled' && status === 'Fulfilled') {
      const lineItems = await OrderLineItem.findAll({ where: { orderId: order.id }, include: [{ model: Product, required: false }] });
      for (const li of lineItems) {
        const product = await Product.findByPk(li.productId);
        if (!product) continue;

        const prevStock = product.stock;
        const newStock = prevStock - li.quantity;
        await product.update({ stock: newStock });

        await InventoryMovement.create({
          id: `inv_${product.id}_${Date.now()}`,
          productId: product.id,
          type: 'out',
          quantity: li.quantity,
          createdAt: new Date().toISOString().slice(0, 10),
        });
      }
    }

    res.json(order);
  } catch (err) {
    next(err);
  }
});

// ------------------------------
// Shipments
// ------------------------------
router.get('/shipments', async (req, res, next) => {
  try {
    const shipments = await Shipment.findAll({
      order: [['updatedAt', 'DESC']],
      include: [{ model: Order, required: false, include: [{ model: Customer, required: false }] }],
    });
    res.json(shipments);
  } catch (err) {
    next(err);
  }
});

router.patch('/shipments/:id', async (req, res, next) => {
  try {
    const schema = z.object({
      status: z.enum(['Pending', 'In Transit', 'Delivered']),
    });
    const { status } = schema.parse(req.body);

    const shipment = await Shipment.findByPk(req.params.id);
    if (!shipment) return res.status(404).json({ error: 'Shipment not found' });

    await shipment.update({ status, updatedAt: new Date().toISOString().slice(0, 10) });
    res.json(shipment);
  } catch (err) {
    next(err);
  }
});

// ------------------------------
// Reports
// ------------------------------
router.get('/reports', async (req, res, next) => {
  try {
    const fulfilled = await Order.findAll({
      where: { status: 'Fulfilled' },
      include: [{ model: OrderLineItem, as: 'lineItems', include: [{ model: Product, required: false }] }],
    });

    // revenue trends by month
    const byMonth = new Map();
    for (const o of fulfilled) {
      const m = monthKey(o.createdAt);
      if (!byMonth.has(m)) byMonth.set(m, { month: m, revenue: 0, orders: 0 });
      const bucket = byMonth.get(m);
      bucket.revenue += moneyTotal(o.toJSON ? o.toJSON() : o);
      bucket.orders += 1;
    }

    const revenueTrends = Array.from(byMonth.values()).sort((a, b) => a.month.localeCompare(b.month));

    // top products by units sold (simple: sum quantities over fulfilled orders)
    const unitsByProduct = new Map();
    for (const o of fulfilled) {
      const items = o.lineItems || [];
      for (const li of items) {
        const productName = li.Product?.name || li.product?.name || undefined;
        const key = li.productId;
        const existing = unitsByProduct.get(key) || { name: productName || key, units: 0 };
        existing.units += li.quantity;
        // keep latest name if missing
        existing.name = existing.name || productName || key;
        unitsByProduct.set(key, existing);
      }
    }

    const topProducts = Array.from(unitsByProduct.values())
      .sort((a, b) => b.units - a.units)
      .slice(0, 5);

    // inventory turnover approximation: units sold / average stock; approximate with current stock.
    const turnover = [];
    for (const [productId, stat] of unitsByProduct.entries()) {
      const product = await Product.findByPk(productId);
      const stock = product ? product.stock : 0;
      const denom = Math.max(1, stock);
      turnover.push({ name: stat.name, turnover: stat.units / denom });
    }

    res.json({
      revenueTrends,
      topProducts,
      inventoryTurnover: turnover.sort((a, b) => b.turnover - a.turnover).slice(0, 8),
    });
  } catch (err) {
    next(err);
  }
});

// ------------------------------
// Customers & Notes
// ------------------------------
router.get('/customers', async (req, res, next) => {
  try {
    const customers = await Customer.findAll({ order: [['name', 'ASC']] });
    res.json(customers);
  } catch (err) {
    next(err);
  }
});

router.get('/customers/:id', async (req, res, next) => {
  try {
    const customer = await Customer.findByPk(req.params.id, { include: [{ model: CustomerNote, as: 'notes' }] });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const orders = await Order.findAll({ where: { customerId: customer.id }, include: [{ model: OrderLineItem, as: 'lineItems', include: [{ model: Product, required: false }] }] });

    // Attach purchase history totals and open shipments.
    const purchaseHistory = orders.map((o) => {
      const json = o.toJSON ? o.toJSON() : o;
      return { ...json, total: moneyTotal(json) };
    });

    const openShipments = await Shipment.findAll({
      include: [{ model: Order, required: true, where: { customerId: customer.id } }],
      where: { status: { $ne: 'Delivered' } },
    });

    res.json({
      ...customer.toJSON(),
      purchaseHistory,
      totalSpend: purchaseHistory.filter((o) => o.status === 'Fulfilled').reduce((sum, o) => sum + (o.total || 0), 0),
      openShipments,
      notes: customer.notes || [],
    });
  } catch (err) {
    next(err);
  }
});

router.post('/customers/:id/notes', async (req, res, next) => {
  try {
    const schema = z.object({
      body: z.string().min(1),
    });
    const { body } = schema.parse(req.body);

    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const note = await CustomerNote.create({
      id: `note_${Date.now()}`,
      customerId: customer.id,
      body,
      createdAt: new Date().toISOString().slice(0, 10),
    });

    res.status(201).json(note);
  } catch (err) {
    next(err);
  }
});


module.exports = router;

