'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('DetalleCotizacion', {
      id_detalle_cotizacion: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      id_cotizacion: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Cotizacion',
          key: 'id_cotizacion'
        }
      },
      id_material: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Material',
          key: 'id_material'
        }
      },
      cantidad: {
        type: Sequelize.DECIMAL(14, 3),
        allowNull: false
      },
      precio_unitario: {
        type: Sequelize.DECIMAL(16, 2),
        allowNull: false
      }
    }, { engine: 'InnoDB' });

    await queryInterface.addConstraint('DetalleCotizacion', {
      fields: ['id_cotizacion', 'id_material'],
      type: 'unique',
      name: 'DetalleCotizacion_id_cotizacion_id_material_unique'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('DetalleCotizacion');
  }
};
