'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('DetalleEntregaVale', {
      id_detalle_entrega: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      id_entrega: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'EntregaVale',
          key: 'id_entrega'
        }
      },
      id_detalle_vale: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'DetalleValeSalida',
          key: 'id_detalle_vale'
        }
      },
      cantidad_entregada: {
        type: Sequelize.DECIMAL(14, 3),
        allowNull: false
      }
    }, { engine: 'InnoDB' });

    await queryInterface.addConstraint('DetalleEntregaVale', {
      fields: ['id_entrega', 'id_detalle_vale'],
      type: 'unique',
      name: 'DetalleEntregaVale_id_entrega_id_detalle_vale_unique'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('DetalleEntregaVale');
  }
};
