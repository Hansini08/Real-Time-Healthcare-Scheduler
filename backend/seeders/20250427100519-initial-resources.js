'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Get current date for timestamps
    const now = new Date();

    // Define the resources to insert
    await queryInterface.bulkInsert('Resources', [
      { name: 'Exam Room 101', type: 'Room', status: 'Available', createdAt: now, updatedAt: now },
      { name: 'Exam Room 102', type: 'Room', status: 'Available', createdAt: now, updatedAt: now },
      { name: 'Exam Room 103', type: 'Room', status: 'Occupied', createdAt: now, updatedAt: now },
      { name: 'Consultation Room A', type: 'Room', status: 'Available', createdAt: now, updatedAt: now },
      { name: 'Procedure Room B', type: 'Room', status: 'Available', createdAt: now, updatedAt: now },
      { name: 'Ward Bed 201', type: 'Bed', status: 'Available', createdAt: now, updatedAt: now },
      { name: 'Ward Bed 202', type: 'Bed', status: 'Occupied', createdAt: now, updatedAt: now },
      { name: 'Recovery Bed R1', type: 'Bed', status: 'Available', createdAt: now, updatedAt: now },
      { name: 'Ventilator #1', type: 'Equipment', status: 'Available', createdAt: now, updatedAt: now },
      { name: 'Ultrasound Machine', type: 'Equipment', status: 'Available', createdAt: now, updatedAt: now },
      { name: 'X-Ray Unit', type: 'Equipment', status: 'Occupied', createdAt: now, updatedAt: now }, // Example occupied equipment
    ], {});
  },

  async down (queryInterface, Sequelize) {
    // Remove all data inserted by this seeder
    await queryInterface.bulkDelete('Resources', null, {});
  }
};