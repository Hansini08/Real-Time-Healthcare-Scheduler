'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Notification extends Model {
    static associate(models) {
      Notification.belongsTo(models.User, { foreignKey: 'recipientId', as: 'recipient' });
    }
  }
  Notification.init({
    recipientId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'Users', key: 'id' } },
    message: { type: DataTypes.TEXT, allowNull: false },
    read: { type: DataTypes.BOOLEAN, defaultValue: false },
    type: { type: DataTypes.ENUM('appointment', 'system'), defaultValue: 'system' },
    link: DataTypes.STRING // Optional link, e.g., to the appointment details
  }, { sequelize, modelName: 'Notification', indexes: [ { fields: ['recipientId', 'createdAt'] } ] });
  return Notification;
};