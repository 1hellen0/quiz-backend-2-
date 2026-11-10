'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Proveedor', {
      id_proveedor: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      nombre: {
        type: Sequelize.STRING(150),
        allowNull: false
      },
      identificacion: {
        type: Sequelize.STRING(40),
        allowNull: false,
        unique: true
      },
      correo: {
        type: Sequelize.STRING(150)
      },
      telefono: {
        type: Sequelize.STRING(30)
      },
      activo: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    }, { engine: 'InnoDB' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Proveedor');
  }
};
