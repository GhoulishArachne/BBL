# BBL (Dashboard + Inventory + Orders + Shipping + CRM)

This workspace will implement a full-stack app for:
- Dashboard KPIs
- Inventory management (catalog/SKUs/stock/reorder thresholds + bulk CSV import)
- Sales & Orders (status tracking Pending → Processing → Fulfilled)
- Shipping & Tracking (shipments linked to orders + carrier + tracking)
- Reports & Analytics (revenue trends, top products, order volume, inventory turnover)
- CRM (customers, search/filter, activity/notes)
- CRM ↔ Orders integration (customer profile shows purchase history, total spend, open shipments)

## Current decision
Python FastAPI was requested, but Python isn't available in this environment.
Backend will be implemented using **Node.js** instead.

## Next steps
- Create project skeleton (backend + frontend)
- Implement database schema and API endpoints
- Implement React UI pages

