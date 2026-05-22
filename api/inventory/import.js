import { z } from 'zod';
import { Product, InventoryMovement } from '../../server/src/models/index.js';

const parseCsvLines = (csv) => {
  const lines = String(csv || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];
  const header = lines[0].split(',').map((s) => s.trim());
  const idx = (col) => header.indexOf(col);

  const required = ['sku', 'name', 'category', 'stock', 'reorderThreshold', 'price'];
  for (const col of required) {
    if (idx(col) === -1) throw new Error(`CSV missing required column: ${col}`);
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

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const schema = z.object({ csv: z.string().min(1) });
    const { csv } = schema.parse(req.body);

    const rows = parseCsvLines(csv);

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

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

