'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('DetalleValeSalida', {
      id_detalle_vale: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      id_vale: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'ValeSalida',
          key: 'id_vale'
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

    await queryInterface.addConstraint('DetalleValeSalida', {
      fields: ['id_vale', 'id_material'],
      type: 'unique',
      name: 'DetalleValeSalida_id_vale_id_material_unique'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('DetalleValeSalida');
  }
};
