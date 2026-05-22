const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const OrderLineItem = sequelize.define(
  'OrderLineItem',
  {
    id: { type: DataTypes.STRING, primaryKey: true },
    orderId: { type: DataTypes.STRING, allowNull: false },
    productId: { type: DataTypes.STRING, allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false },
    unitPrice: { type: DataTypes.INTEGER, allowNull: false },
  },
  {
    tableName: 'order_line_items',
    timestamps: false,
  },
);

module.exports = OrderLineItem;

