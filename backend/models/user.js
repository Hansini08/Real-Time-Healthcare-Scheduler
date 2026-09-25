'use strict';
const { Model } = require('sequelize');
const bcrypt = require('bcryptjs');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.hasMany(models.Appointment, { foreignKey: 'patientId', as: 'patientAppointments' });
      User.hasMany(models.Appointment, { foreignKey: 'providerId', as: 'providerAppointments' });
      User.hasMany(models.Notification, { foreignKey: 'recipientId', as: 'notifications' });
    }
    async matchPassword(enteredPassword) { return await bcrypt.compare(enteredPassword, this.password); }
  }
  User.init({
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
    password: { type: DataTypes.STRING, allowNull: false, validate: { len: [6, 100] } },
    role: { type: DataTypes.ENUM('patient', 'provider'), allowNull: false }, // Simplified roles
    specialization: DataTypes.STRING // Required for providers during registration/update
  }, {
    sequelize, modelName: 'User',
    hooks: {
        beforeCreate: async (user) => { if (user.password) { const salt = await bcrypt.genSalt(10); user.password = await bcrypt.hash(user.password, salt); } },
        beforeUpdate: async (user) => { if (user.changed('password')) { const salt = await bcrypt.genSalt(10); user.password = await bcrypt.hash(user.password, salt); } }
    },
    defaultScope: { attributes: { exclude: ['password'] } },
    scopes: { withPassword: { attributes: {} } }
  });
  return User;
};