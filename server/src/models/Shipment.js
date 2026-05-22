const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Shipment = sequelize.define(
  'Shipment',
  {
    id: { type: DataTypes.STRING, primaryKey: true },
    orderId: { type: DataTypes.STRING, allowNull: false },
    carrier: { type: DataTypes.STRING, allowNull: false },
    trackingNumber: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    status: { type: DataTypes.STRING, allowNull: false }, // Pending | In Transit | Delivered
    updatedAt: { type: DataTypes.DATEONLY, allowNull: false },
  },
  {
    tableName: 'shipments',
    timestamps: false,
  },
);

module.exports = Shipment;

