const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Order = sequelize.define(
  'Order',
  {
    id: { type: DataTypes.STRING, primaryKey: true },
    customerId: { type: DataTypes.STRING, allowNull: false },
    status: { type: DataTypes.STRING, allowNull: false }, // Pending | Processing | Fulfilled
    createdAt: { type: DataTypes.DATEONLY, allowNull: false },
  },
  {
    tableName: 'orders',
    timestamps: false,
  },
);

module.exports = Order;

