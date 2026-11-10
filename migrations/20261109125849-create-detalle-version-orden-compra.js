'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('DetalleVersionOrdenCompra', {
      id_detalle_version: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      id_version: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'VersionOrdenCompra',
          key: 'id_version'
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

    await queryInterface.addConstraint('DetalleVersionOrdenCompra', {
      fields: ['id_version', 'id_material'],
      type: 'unique',
      name: 'DetalleVersionOrdenCompra_id_version_id_material_unique'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('DetalleVersionOrdenCompra');
  }
};
