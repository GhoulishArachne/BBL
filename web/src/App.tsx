import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import './styles.css';

type Kpis = {
  revenue: number;
  openOrders: number;
  lowStockAlerts: number;
  pendingShipments: number;
  topCustomers: { customerId: string; name: string; totalSpend: number }[];
};
type Product = { id: string; sku: string; name: string; category: string; stock: number; reorderThreshold: number; price: number };
type Customer = { id: string; name: string; company: string; region: string; assignedRep: string; status: string; totalSpend?: number; openShipments?: Shipment[]; purchaseHistory?: Order[]; notes?: { id: string; body: string; createdAt: string }[] };
type Order = { id: string; customerId: string; status: string; createdAt: string; total: number; customer?: Customer; lineItems: { productId: string; quantity: number; unitPrice: number; product?: Product }[] };
type Shipment = { id: string; orderId: string; carrier: string; trackingNumber: string; status: string; updatedAt: string; order?: Order };
type Reports = { revenueTrends: { month: string; revenue: number; orders: number }[]; topProducts: { name: string; units: number }[]; inventoryTurnover: { name: string; turnover: number }[] };

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export default function App() {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [reports, setReports] = useState<Reports | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState('cus_1');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [inventorySearch, setInventorySearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [csv, setCsv] = useState('sku,name,category,stock,reorderThreshold,price\nBBL-WTR-12,Sparkling Water 12 Pack,Beverage,88,60,30');

  const refresh = () => {
    void Promise.all([
      axios.get<Kpis>('/api/kpis').then((res) => setKpis(res.data)),
      axios.get<Product[]>('/api/inventory').then((res) => setProducts(res.data)),
      axios.get<Order[]>('/api/orders').then((res) => setOrders(res.data)),
      axios.get<Shipment[]>('/api/shipments').then((res) => setShipments(res.data)),
      axios.get<Customer[]>('/api/customers').then((res) => setCustomers(res.data)),
      axios.get<Reports>('/api/reports').then((res) => setReports(res.data)),
    ]);
  };

  useEffect(refresh, []);
  useEffect(() => {
    if (selectedCustomerId) {
      void axios.get<Customer>(`/api/customers/${selectedCustomerId}`).then((res) => setSelectedCustomer(res.data));
    }
  }, [selectedCustomerId, orders, shipments]);

  const filteredProducts = useMemo(() => {
    const q = inventorySearch.toLowerCase();
    return products.filter((product) => [product.name, product.sku, product.category].some((value) => value.toLowerCase().includes(q)));
  }, [products, inventorySearch]);

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.toLowerCase();
    return customers.filter((customer) => [customer.name, customer.company, customer.region, customer.assignedRep].some((value) => value.toLowerCase().includes(q)));
  }, [customers, customerSearch]);

  const updateOrderStatus = async (order: Order, status: string) => {
    await axios.patch(`/api/orders/${order.id}`, { status });
    refresh();
  };

  const updateShipment = async (shipment: Shipment, status: string) => {
    await axios.patch(`/api/shipments/${shipment.id}`, { status });
    refresh();
  };

  const importCsv = async () => {
    await axios.post('/api/inventory/import', { csv });
    refresh();
  };

  return (
    <main>
      <header className="topbar">
        <div>
          <h1>BBL Operations</h1>
          <p>Dashboard, inventory, orders, shipping, reports, and CRM.</p>
        </div>
        <button onClick={refresh}>Refresh</button>
      </header>

      <section className="kpis">
        <Metric label="Revenue" value={kpis ? money.format(kpis.revenue) : '...'} />
        <Metric label="Open orders" value={kpis?.openOrders ?? '...'} />
        <Metric label="Low stock" value={kpis?.lowStockAlerts ?? '...'} warning />
        <Metric label="Pending shipments" value={kpis?.pendingShipments ?? '...'} />
      </section>

      <section className="grid two">
        <Panel title="Revenue Trend">
          <Chart data={reports?.revenueTrends ?? []} kind="line" xKey="month" yKey="revenue" />
        </Panel>
        <Panel title="Top Products">
          <Chart data={reports?.topProducts ?? []} kind="bar" xKey="name" yKey="units" />
        </Panel>
      </section>

      <section className="grid two">
        <Panel title="Inventory">
          <div className="controls">
            <input value={inventorySearch} onChange={(event) => setInventorySearch(event.target.value)} placeholder="Search catalog" />
          </div>
          <Table
            headers={['SKU', 'Product', 'Category', 'Stock', 'Reorder', 'Price']}
            rows={filteredProducts.map((product) => [
              product.sku,
              product.name,
              product.category,
              <strong className={product.stock <= product.reorderThreshold ? 'danger' : ''}>{product.stock}</strong>,
              product.reorderThreshold,
              money.format(product.price),
            ])}
          />
          <div className="importer">
            <textarea value={csv} onChange={(event) => setCsv(event.target.value)} />
            <button onClick={importCsv}>Import CSV</button>
          </div>
        </Panel>

        <Panel title="Orders">
          <Table
            headers={['Order', 'Customer', 'Status', 'Total', 'Items', 'Update']}
            rows={orders.map((order) => [
              order.id,
              order.customer?.name,
              <span className={`pill ${order.status.toLowerCase()}`}>{order.status}</span>,
              money.format(order.total),
              order.lineItems.map((item) => `${item.product?.sku} x${item.quantity}`).join(', '),
              <select value={order.status} onChange={(event) => updateOrderStatus(order, event.target.value)}>
                {['Pending', 'Processing', 'Fulfilled'].map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>,
            ])}
          />
        </Panel>
      </section>

      <section className="grid two">
        <Panel title="Shipping">
          <Table
            headers={['Shipment', 'Order', 'Carrier', 'Tracking', 'Status']}
            rows={shipments.map((shipment) => [
              shipment.id,
              shipment.orderId,
              shipment.carrier,
              shipment.trackingNumber || 'Pending',
              <select value={shipment.status} onChange={(event) => updateShipment(shipment, event.target.value)}>
                {['Pending', 'In Transit', 'Delivered'].map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>,
            ])}
          />
        </Panel>

        <Panel title="CRM">
          <div className="controls">
            <input value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} placeholder="Search customers" />
            <select value={selectedCustomerId} onChange={(event) => setSelectedCustomerId(event.target.value)}>
              {filteredCustomers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>
          {selectedCustomer && (
            <div className="profile">
              <h3>{selectedCustomer.name}</h3>
              <p>{selectedCustomer.company} · {selectedCustomer.region} · {selectedCustomer.assignedRep}</p>
              <div className="profileStats">
                <Metric label="Total spend" value={money.format(selectedCustomer.totalSpend ?? 0)} />
                <Metric label="Open shipments" value={selectedCustomer.openShipments?.length ?? 0} />
                <Metric label="Orders" value={selectedCustomer.purchaseHistory?.length ?? 0} />
              </div>
              <Table
                headers={['Order', 'Status', 'Total']}
                rows={(selectedCustomer.purchaseHistory ?? []).map((order) => [order.id, order.status, money.format(order.total)])}
              />
              <ul className="notes">
                {(selectedCustomer.notes ?? []).map((note) => (
                  <li key={note.id}>{note.createdAt}: {note.body}</li>
                ))}
              </ul>
            </div>
          )}
        </Panel>
      </section>
    </main>
  );
}

function Metric({ label, value, warning = false }: { label: string; value: React.ReactNode; warning?: boolean }) {
  return (
    <div className={`metric ${warning ? 'warning' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="tableWrap">
      <table>
        <thead>
          <tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Chart({ data, kind, xKey, yKey }: { data: Record<string, string | number>[]; kind: 'bar' | 'line'; xKey: string; yKey: string }) {
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height="100%">
        {kind === 'line' ? (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey={yKey} stroke="#0f766e" strokeWidth={3} />
          </LineChart>
        ) : (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip />
            <Bar dataKey={yKey} fill="#2563eb" />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
