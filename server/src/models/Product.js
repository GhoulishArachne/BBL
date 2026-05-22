const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Product = sequelize.define(
  'Product',
  {
    id: { type: DataTypes.STRING, primaryKey: true },
    sku: { type: DataTypes.STRING, allowNull: false, unique: true },
    name: { type: DataTypes.STRING, allowNull: false },
    category: { type: DataTypes.STRING, allowNull: true },
    stock: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    reorderThreshold: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    price: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: 'products',
    timestamps: false,
  },
);

module.exports = Product;

