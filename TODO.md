# TODO

## Step 1: Bootstrap repo (Node.js backend + React)
- Create backend skeleton: Node.js API, ORM/models, validation.
- Create frontend skeleton: React + TypeScript (Vite).
- Add shared development scripts and environment configuration.

## Step 2: Database schema (core entities)
- Customers (CRM): contact info, company, region, assigned rep, status, activity/notes.
- Products/Catalog + SKUs: stock levels, reorder thresholds.
- Inventory movement model (recommended) for turnover/stock history.
- Orders + line items: status Pending → Processing → Fulfilled, pricing.
- Shipments + tracking: carrier, tracking number, status updates, linked to orders.

## Step 3: Backend APIs
- KPIs endpoints: revenue, open orders, low-stock alerts, pending shipments, top customers.
- Inventory endpoints: product catalog with filters, SKU/stock view, bulk CSV import.
- Orders endpoints: create/manage orders, line items, pricing, status tracking.
- Shipping endpoints: create/update shipments, carriers/tracking, shipment status updates.
- Reports endpoints: revenue trends, top products, order volume charts, inventory turnover.
- CRM endpoints: customer CRUD, activity/notes log, full search + filters; customer profile view includes order history + open shipments.

## Step 4: CRM ↔ Orders integration
- Ensure Orders reference CRM customers.
- Ensure customer profile queries aggregate total spend, open shipments, and purchase history.

## Step 5: Frontend pages & integration
- Dashboard: KPI cards + charts.
- Inventory: catalog table, low-stock alerts, reorder thresholds, CSV import UI.
- Orders: order list + detail (status stepper, editable line items).
- Shipping/Tracking: shipment list + order linking + tracking input.
- Reports: charts for revenue trends, top products, order volume, turnover.
- CRM: customer list with advanced filters + full search; customer profile with purchase history + open shipments + notes.

## Step 6: Seed data + dev workflow
- Create seed scripts with sample customers/products/orders/shipments.
- Provide run instructions for backend/frontend.

## Step 7: Testing
- Unit tests for CSV import and core calculations (KPI/turnover).
- Basic API tests for critical flows.

