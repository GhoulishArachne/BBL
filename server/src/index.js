const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { z } = require('zod');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const now = new Date('2026-05-22T12:00:00.000Z');
let nextId = 1000;
const id = (prefix) => `${prefix}_${nextId++}`;

const db = {
  customers: [
    {
      id: 'cus_1',
      name: 'Northstar Grocery',
      company: 'Northstar Foods',
      email: 'ops@northstar.example',
      phone: '555-0101',
      region: 'Northeast',
      assignedRep: 'Avery Chen',
      status: 'Active',
      notes: [{ id: 'note_1', body: 'Prefers Thursday delivery windows.', createdAt: '2026-05-01' }],
    },
    {
      id: 'cus_2',
      name: 'Canyon Market',
      company: 'Canyon Retail Group',
      email: 'buyer@canyon.example',
      phone: '555-0134',
      region: 'West',
      assignedRep: 'Mina Patel',
      status: 'Active',
      notes: [{ id: 'note_2', body: 'Negotiating summer promotional bundle.', createdAt: '2026-05-14' }],
    },
    {
      id: 'cus_3',
      name: 'Harbor Supply',
      company: 'Harbor Supply Co.',
      email: 'orders@harbor.example',
      phone: '555-0188',
      region: 'Southeast',
      assignedRep: 'Luis Romero',
      status: 'Prospect',
      notes: [],
    },
  ],
  products: [
    { id: 'prd_1', sku: 'BBL-COF-12', name: 'Cold Brew 12 Pack', category: 'Beverage', stock: 42, reorderThreshold: 50, price: 36 },
    { id: 'prd_2', sku: 'BBL-TEA-24', name: 'Green Tea 24 Pack', category: 'Beverage', stock: 140, reorderThreshold: 80, price: 42 },
    { id: 'prd_3', sku: 'BBL-SNK-18', name: 'Protein Snack 18 Pack', category: 'Snacks', stock: 24, reorderThreshold: 40, price: 54 },
    { id: 'prd_4', sku: 'BBL-BAR-30', name: 'Granola Bar 30 Pack', category: 'Snacks', stock: 210, reorderThreshold: 100, price: 48 },
  ],
  inventoryMovements: [
    { id: 'mov_1', productId: 'prd_1', type: 'out', quantity: 60, createdAt: '2026-04-19' },
    { id: 'mov_2', productId: 'prd_2', type: 'out', quantity: 35, createdAt: '2026-05-02' },
    { id: 'mov_3', productId: 'prd_3', type: 'out', quantity: 90, createdAt: '2026-05-12' },
    { id: 'mov_4', productId: 'prd_4', type: 'in', quantity: 120, createdAt: '2026-05-16' },
  ],
  orders: [
    {
      id: 'ord_1',
      customerId: 'cus_1',
      status: 'Fulfilled',
      createdAt: '2026-04-20',
      lineItems: [
        { productId: 'prd_1', quantity: 20, unitPrice: 36 },
        { productId: 'prd_4', quantity: 15, unitPrice: 48 },
      ],
    },
    {
      id: 'ord_2',
      customerId: 'cus_2',
      status: 'Processing',
      createdAt: '2026-05-10',
      lineItems: [
        { productId: 'prd_2', quantity: 35, unitPrice: 42 },
        { productId: 'prd_3', quantity: 18, unitPrice: 54 },
      ],
    },
    {
      id: 'ord_3',
      customerId: 'cus_1',
      status: 'Pending',
      createdAt: '2026-05-18',
      lineItems: [{ productId: 'prd_3', quantity: 10, unitPrice: 54 }],
    },
  ],
  shipments: [
    { id: 'shp_1', orderId: 'ord_1', carrier: 'UPS', trackingNumber: '1Z999AA101', status: 'Delivered', updatedAt: '2026-04-24' },
    { id: 'shp_2', orderId: 'ord_2', carrier: 'FedEx', trackingNumber: '6129999900', status: 'In Transit', updatedAt: '2026-05-21' },
    { id: 'shp_3', orderId: 'ord_3', carrier: 'USPS', trackingNumber: '', status: 'Pending', updatedAt: '2026-05-22' },
  ],
};

const orderTotal = (order) => order.lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
const withOrderDetails = (order) => ({
  ...order,
  customer: db.customers.find((customer) => customer.id === order.customerId),
  lineItems: order.lineItems.map((item) => ({ ...item, product: db.products.find((product) => product.id === item.productId) })),
  total: orderTotal(order),
});
const monthKey = (date) => date.slice(0, 7);

app.get('/api/health', (req, res) => res.json({ ok: true, timestamp: now.toISOString() }));

app.get('/api/kpis', (req, res) => {
  const revenue = db.orders.filter((order) => order.status === 'Fulfilled').reduce((sum, order) => sum + orderTotal(order), 0);
  const lowStock = db.products.filter((product) => product.stock <= product.reorderThreshold);
  const pendingShipments = db.shipments.filter((shipment) => shipment.status !== 'Delivered');
  const spendByCustomer = db.customers
    .map((customer) => ({
      customerId: customer.id,
      name: customer.name,
      totalSpend: db.orders.filter((order) => order.customerId === customer.id).reduce((sum, order) => sum + orderTotal(order), 0),
    }))
    .sort((a, b) => b.totalSpend - a.totalSpend);

  res.json({
    revenue,
    openOrders: db.orders.filter((order) => order.status !== 'Fulfilled').length,
    lowStockAlerts: lowStock.length,
    pendingShipments: pendingShipments.length,
    topCustomers: spendByCustomer.slice(0, 5),
  });
});

app.get('/api/inventory', (req, res) => {
  const { search = '', lowStock } = req.query;
  const q = String(search).toLowerCase();
  res.json(
    db.products.filter((product) => {
      const matches = !q || [product.name, product.sku, product.category].some((value) => value.toLowerCase().includes(q));
      const matchesStock = lowStock !== 'true' || product.stock <= product.reorderThreshold;
      return matches && matchesStock;
    }),
  );
});

app.post('/api/inventory/import', (req, res) => {
  const csv = z.string().min(1).parse(req.body.csv);
  const rows = csv
    .trim()
    .split(/\r?\n/)
    .map((row) => row.split(',').map((cell) => cell.trim()));
  const [header, ...data] = rows;
  const indexes = Object.fromEntries(header.map((name, index) => [name, index]));

  data.forEach((row) => {
    const sku = row[indexes.sku];
    const existing = db.products.find((product) => product.sku === sku);
    const product = {
      id: existing?.id || id('prd'),
      sku,
      name: row[indexes.name],
      category: row[indexes.category] || 'General',
      stock: Number(row[indexes.stock] || 0),
      reorderThreshold: Number(row[indexes.reorderThreshold] || 0),
      price: Number(row[indexes.price] || 0),
    };
    if (existing) Object.assign(existing, product);
    else db.products.push(product);
  });

  res.status(201).json({ imported: data.length, products: db.products });
});

app.get('/api/orders', (req, res) => res.json(db.orders.map(withOrderDetails)));

app.post('/api/orders', (req, res) => {
  const payload = z
    .object({
      customerId: z.string(),
      status: z.enum(['Pending', 'Processing', 'Fulfilled']).default('Pending'),
      lineItems: z.array(z.object({ productId: z.string(), quantity: z.number().positive(), unitPrice: z.number().nonnegative() })).min(1),
    })
    .parse(req.body);
  const order = { id: id('ord'), createdAt: now.toISOString().slice(0, 10), ...payload };
  db.orders.push(order);
  res.status(201).json(withOrderDetails(order));
});

app.patch('/api/orders/:id', (req, res) => {
  const order = db.orders.find((item) => item.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  Object.assign(order, req.body);
  return res.json(withOrderDetails(order));
});

app.get('/api/shipments', (req, res) => {
  res.json(db.shipments.map((shipment) => ({ ...shipment, order: withOrderDetails(db.orders.find((order) => order.id === shipment.orderId)) })));
});

app.post('/api/shipments', (req, res) => {
  const payload = z
    .object({
      orderId: z.string(),
      carrier: z.string(),
      trackingNumber: z.string().optional().default(''),
      status: z.enum(['Pending', 'In Transit', 'Delivered']).default('Pending'),
    })
    .parse(req.body);
  const shipment = { id: id('shp'), updatedAt: now.toISOString().slice(0, 10), ...payload };
  db.shipments.push(shipment);
  res.status(201).json(shipment);
});

app.patch('/api/shipments/:id', (req, res) => {
  const shipment = db.shipments.find((item) => item.id === req.params.id);
  if (!shipment) return res.status(404).json({ error: 'Shipment not found' });
  Object.assign(shipment, req.body, { updatedAt: now.toISOString().slice(0, 10) });
  return res.json(shipment);
});

app.get('/api/reports', (req, res) => {
  const revenueTrends = Object.values(
    db.orders.reduce((acc, order) => {
      const key = monthKey(order.createdAt);
      acc[key] ||= { month: key, revenue: 0, orders: 0 };
      acc[key].revenue += orderTotal(order);
      acc[key].orders += 1;
      return acc;
    }, {}),
  );
  const topProducts = db.products
    .map((product) => ({
      productId: product.id,
      name: product.name,
      units: db.orders.flatMap((order) => order.lineItems).filter((item) => item.productId === product.id).reduce((sum, item) => sum + item.quantity, 0),
    }))
    .sort((a, b) => b.units - a.units);
  const inventoryTurnover = db.products.map((product) => {
    const unitsOut = db.inventoryMovements.filter((movement) => movement.productId === product.id && movement.type === 'out').reduce((sum, movement) => sum + movement.quantity, 0);
    return { productId: product.id, name: product.name, turnover: Number((unitsOut / Math.max(product.stock, 1)).toFixed(2)) };
  });

  res.json({ revenueTrends, topProducts, orderVolume: revenueTrends, inventoryTurnover });
});

app.get('/api/customers', (req, res) => {
  const { search = '', region, status } = req.query;
  const q = String(search).toLowerCase();
  res.json(
    db.customers.filter((customer) => {
      const matchesSearch = !q || [customer.name, customer.company, customer.email, customer.assignedRep].some((value) => value.toLowerCase().includes(q));
      return matchesSearch && (!region || customer.region === region) && (!status || customer.status === status);
    }),
  );
});

app.post('/api/customers', (req, res) => {
  const customer = { id: id('cus'), notes: [], ...req.body };
  db.customers.push(customer);
  res.status(201).json(customer);
});

app.get('/api/customers/:id', (req, res) => {
  const customer = db.customers.find((item) => item.id === req.params.id);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });
  const orders = db.orders.filter((order) => order.customerId === customer.id).map(withOrderDetails);
  const orderIds = new Set(orders.map((order) => order.id));
  const openShipments = db.shipments.filter((shipment) => orderIds.has(shipment.orderId) && shipment.status !== 'Delivered');
  return res.json({
    ...customer,
    totalSpend: orders.reduce((sum, order) => sum + order.total, 0),
    purchaseHistory: orders,
    openShipments,
  });
});

app.patch('/api/customers/:id', (req, res) => {
  const customer = db.customers.find((item) => item.id === req.params.id);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });
  Object.assign(customer, req.body);
  return res.json(customer);
});

app.post('/api/customers/:id/notes', (req, res) => {
  const customer = db.customers.find((item) => item.id === req.params.id);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });
  const note = { id: id('note'), body: z.string().min(1).parse(req.body.body), createdAt: now.toISOString().slice(0, 10) };
  customer.notes.push(note);
  return res.status(201).json(note);
});

app.use((err, req, res, next) => {
  if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
  return next(err);
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
