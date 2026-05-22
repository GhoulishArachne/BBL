const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const CustomerNote = sequelize.define(
  'CustomerNote',
  {
    id: { type: DataTypes.STRING, primaryKey: true },
    customerId: { type: DataTypes.STRING, allowNull: false },
    body: { type: DataTypes.STRING, allowNull: false },
    createdAt: { type: DataTypes.DATEONLY, allowNull: false },
  },
  {
    tableName: 'customer_notes',
    timestamps: false,
  },
);

module.exports = CustomerNote;

