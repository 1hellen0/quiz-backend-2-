'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('AprobacionCompra', {
      id_aprobacion: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      id_version: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'VersionOrdenCompra',
          key: 'id_version'
        }
      },
      nivel_requerido: {
        type: Sequelize.STRING(35),
        allowNull: false
      },
      cotizaciones_requeridas: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      monto_evaluado: {
        type: Sequelize.DECIMAL(16, 2),
        allowNull: false
      },
      estado: {
        type: Sequelize.STRING(30),
        allowNull: false
      },
      fecha_solicitud: {
        type: Sequelize.DATE,
        allowNull: false
      }
    }, { engine: 'InnoDB' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('AprobacionCompra');
  }
};
