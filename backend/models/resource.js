'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Resource extends Model {
    static associate(models) { /* No associations defined for this simple version */ }
  }
  Resource.init({
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    type: { type: DataTypes.STRING, allowNull: false }, // e.g., 'Room', 'Bed', 'Ventilator'
    status: { type: DataTypes.ENUM('Available', 'Occupied'), allowNull: false, defaultValue: 'Available' }
  }, { sequelize, modelName: 'Resource' });
  return Resource;
};