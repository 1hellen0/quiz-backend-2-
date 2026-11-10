'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ComiteAprobacion', {
      id_comite: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      id_aprobacion: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'AprobacionCompra',
          key: 'id_aprobacion'
        }
      },
      fecha_creacion: {
        type: Sequelize.DATE,
        allowNull: false
      },
      estado: {
        type: Sequelize.STRING(25),
        allowNull: false
      }
    }, { engine: 'InnoDB' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ComiteAprobacion');
  }
};
