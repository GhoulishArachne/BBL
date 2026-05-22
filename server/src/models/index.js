const { sequelize } = require('../config/db');

const Customer = require('./Customer');
const Product = require('./Product');
const InventoryMovement = require('./InventoryMovement');
const Order = require('./Order');
const OrderLineItem = require('./OrderLineItem');
const Shipment = require('./Shipment');
const CustomerNote = require('./CustomerNote');

Customer.hasMany(Order, { foreignKey: 'customerId' });
Order.belongsTo(Customer, { foreignKey: 'customerId' });

Order.hasMany(OrderLineItem, { foreignKey: 'orderId', as: 'lineItems' });
OrderLineItem.belongsTo(Order, { foreignKey: 'orderId' });

Product.hasMany(OrderLineItem, { foreignKey: 'productId' });
OrderLineItem.belongsTo(Product, { foreignKey: 'productId' });

Customer.hasMany(CustomerNote, { foreignKey: 'customerId', as: 'notes' });
CustomerNote.belongsTo(Customer, { foreignKey: 'customerId' });

Product.hasMany(InventoryMovement, { foreignKey: 'productId', as: 'inventoryMovements' });
InventoryMovement.belongsTo(Product, { foreignKey: 'productId' });

Order.hasMany(Shipment, { foreignKey: 'orderId', as: 'shipments' });
Shipment.belongsTo(Order, { foreignKey: 'orderId' });

module.exports = {
  sequelize,
  Customer,
  Product,
  InventoryMovement,
  Order,
  OrderLineItem,
  Shipment,
  CustomerNote,
};

