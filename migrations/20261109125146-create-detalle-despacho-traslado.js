'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('DetalleDespachoTraslado', {
      id_detalle_despacho: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      id_despacho: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'DespachoTraslado',
          key: 'id_despacho'
        }
      },
      id_detalle_traslado: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'DetalleTraslado',
          key: 'id_detalle_traslado'
        }
      },
      cantidad_despachada: {
        type: Sequelize.DECIMAL(14, 3),
        allowNull: false
      }
    }, { engine: 'InnoDB' });

    await queryInterface.addConstraint('DetalleDespachoTraslado', {
      fields: ['id_despacho', 'id_detalle_traslado'],
      type: 'unique',
      name: 'DetalleDespachoTraslado_id_despacho_id_detalle_traslado_unique'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('DetalleDespachoTraslado');
  }
};
