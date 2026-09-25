'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Appointment extends Model {
    static associate(models) {
      Appointment.belongsTo(models.User, { foreignKey: 'patientId', as: 'patient' });
      Appointment.belongsTo(models.User, { foreignKey: 'providerId', as: 'provider' });
    }
  }
  Appointment.init({
    patientId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'Users', key: 'id' } },
    providerId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'Users', key: 'id' } },
    dateTime: { type: DataTypes.DATE, allowNull: false },
    status: { type: DataTypes.ENUM('Upcoming', 'Completed', 'Cancelled'), allowNull: false, defaultValue: 'Upcoming' },
    reason: DataTypes.TEXT
  }, { sequelize, modelName: 'Appointment', indexes: [ { fields: ['patientId', 'dateTime'] }, { fields: ['providerId', 'dateTime'] } ]});
  return Appointment;
};