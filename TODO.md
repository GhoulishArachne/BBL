# TODO - Full-stack BBL skeleton

## Backend (Node/Express + Postgres + Sequelize)
- [x] Inspect existing backend entrypoint and dependencies
- [ ] Create Sequelize/PG config + model definitions (Customer, Product, InventoryMovement, Order, OrderLineItem, Shipment, CustomerNote)

- [ ] Create Express router structure and migrate existing `/api/*` routes to controllers
- [ ] Implement API responses to match current React expectations
- [ ] Add migrations + seed data
- [ ] Add `server/.env.example` and update server to read env vars

## Frontend (React + API integration)
- [ ] Introduce client api layer (`web/src/api/*`)
- [ ] Split `web/src/App.tsx` into pages/components
- [ ] Add React Router pages: Dashboard, Inventory, Orders, Shipping, CRM
- [ ] Ensure UI data types remain compatible with API

## Integration
- [ ] Start Postgres and run server migrations/seed
- [ ] Run both dev servers and verify key flows:
  - [ ] Dashboard KPIs + charts
  - [ ] Inventory search + CSV import
  - [ ] Create/update orders + shipment updates
  - [ ] Customer search + notes

