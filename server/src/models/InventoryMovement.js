const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const InventoryMovement = sequelize.define(
  'InventoryMovement',
  {
    id: { type: DataTypes.STRING, primaryKey: true },
    productId: { type: DataTypes.STRING, allowNull: false },
    type: { type: DataTypes.STRING, allowNull: false }, // 'in' | 'out'
    quantity: { type: DataTypes.INTEGER, allowNull: false },
    createdAt: { type: DataTypes.DATEONLY, allowNull: false },
  },
  {
    tableName: 'inventory_movements',
    timestamps: false,
  },
);

module.exports = InventoryMovement;

