'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('DetalleRecepcionCompra', {
      id_detalle_recepcion_compra: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      id_recepcion_compra: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'RecepcionCompra',
          key: 'id_recepcion_compra'
        }
      },
      id_detalle_version: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'DetalleVersionOrdenCompra',
          key: 'id_detalle_version'
        }
      },
      cantidad_entregada: {
        type: Sequelize.DECIMAL(14, 3),
        allowNull: false
      },
      cantidad_aceptada: {
        type: Sequelize.DECIMAL(14, 3),
        allowNull: false
      },
      cantidad_rechazada: {
        type: Sequelize.DECIMAL(14, 3),
        allowNull: false
      }
    }, { engine: 'InnoDB' });

    await queryInterface.addConstraint('DetalleRecepcionCompra', {
      fields: ['id_recepcion_compra', 'id_detalle_version'],
      type: 'unique',
      name: 'DetalleRecepcionCompra_id_recepcion_id_detalle_version_unique'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('DetalleRecepcionCompra');
  }
};
