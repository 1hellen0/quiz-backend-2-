'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('DetalleRecepcionTraslado', {
      id_detalle_recepcion_traslado: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      id_recepcion_traslado: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'RecepcionTraslado',
          key: 'id_recepcion_traslado'
        }
      },
      id_detalle_despacho: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'DetalleDespachoTraslado',
          key: 'id_detalle_despacho'
        }
      },
      cantidad_recibida: {
        type: Sequelize.DECIMAL(14, 3),
        allowNull: false
      }
    }, { engine: 'InnoDB' });

    await queryInterface.addConstraint('DetalleRecepcionTraslado', {
      fields: ['id_recepcion_traslado', 'id_detalle_despacho'],
      type: 'unique',
      name: 'DetalleRecepcionTraslado_id_recepcion_id_detalle_despacho_unique'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('DetalleRecepcionTraslado');
  }
};
