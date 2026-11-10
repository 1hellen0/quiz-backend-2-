'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('DetalleTraslado', {
      id_detalle_traslado: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      id_traslado: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Traslado',
          key: 'id_traslado'
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
      cantidad_solicitada: {
        type: Sequelize.DECIMAL(14, 3),
        allowNull: false
      }
    }, { engine: 'InnoDB' });

    await queryInterface.addConstraint('DetalleTraslado', {
      fields: ['id_traslado', 'id_material'],
      type: 'unique',
      name: 'DetalleTraslado_id_traslado_id_material_unique'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('DetalleTraslado');
  }
};
